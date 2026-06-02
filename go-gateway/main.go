package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

type Claims struct {
	UserID  string `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type Client struct {
	Conn     *websocket.Conn
	UserID   string
	Username string
	RoomID   string
}

type IncomingMessage struct {
	Type    string `json:"type"`
	RoomID  string `json:"roomId"`
	Content string `json:"content"`
}

type PersistMessagePayload struct {
	RoomID   string `json:"roomId"`
	SenderID string `json:"senderId"`
	Content  string `json:"content"`
	Type     string `json:"type"`
}

type PersistResponse struct {
	Message any `json:"message"`
}

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	clients   = make(map[*Client]bool)
	roomUsers = make(map[string]map[*Client]bool)

	mutex sync.Mutex
)

func main() {
	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	router.GET("/ws", handleWebSocket)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Go WebSocket server running on :", port)

	router.Run(":" + port)
}

func handleWebSocket(c *gin.Context) {
	token := c.Query("token")

	if token == "" {
		c.JSON(401, gin.H{
			"error": "missing token",
		})
		return
	}

	claims, err := verifyJWT(token)
	if err != nil {
		c.JSON(401, gin.H{
			"error": "invalid token",
		})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}

	client := &Client{
		Conn:     conn,
		UserID:   claims.UserID,
		Username: claims.Username,
	}

	mutex.Lock()
	clients[client] = true
	mutex.Unlock()

	log.Println("Client connected:", client.UserID)

	defer disconnectClient(client)

	for {
		var msg IncomingMessage

		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("read error:", err)
			break
		}

		switch msg.Type {

		case "join_room":
			joinRoom(client, msg.RoomID)

		case "leave_room":
			leaveRoom(client)

		case "send_message":
			handleSendMessage(client, msg)
		}
	}
}

func verifyJWT(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")

	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		},
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)

	if !ok || !token.Valid {
		return nil, err
	}

	return claims, nil
}

func joinRoom(client *Client, roomID string) {
    mutex.Lock()
    defer mutex.Unlock()

    if client.RoomID != "" {
        leaveRoomLocked(client) // ← was leaveRoom(client), caused deadlock
    }

    client.RoomID = roomID

    if roomUsers[roomID] == nil {
        roomUsers[roomID] = make(map[*Client]bool)
    }

    roomUsers[roomID][client] = true
    log.Printf("User %s joined room %s\n", client.UserID, roomID)

    client.Conn.WriteJSON(gin.H{
        "type":   "joined_room",
        "roomId": roomID,
    })
}


func leaveRoom(client *Client) {
	mutex.Lock()
	defer mutex.Unlock()

	if client.RoomID == "" {
		return
	}

	roomID := client.RoomID

	if roomUsers[roomID] != nil {
		delete(roomUsers[roomID], client)

		if len(roomUsers[roomID]) == 0 {
			delete(roomUsers, roomID)
		}
	}

	client.RoomID = ""

	log.Printf("User %s left room %s\n", client.UserID, roomID)
}

func disconnectClient(client *Client) {
    mutex.Lock()
    defer mutex.Unlock()

    leaveRoomLocked(client) // ← was leaveRoom(client), caused deadlock

    delete(clients, client)
    client.Conn.Close()
    log.Println("Client disconnected:", client.UserID)
}

func handleSendMessage(client *Client, msg IncomingMessage) {
	if client.RoomID == "" {
		client.Conn.WriteJSON(gin.H{
			"error": "join room first",
		})
		return
	}

	payload := PersistMessagePayload{
		RoomID:   msg.RoomID,
		SenderID: client.UserID,
		Content:  msg.Content,
		Type:     "text",
	}

	savedMessage, err := persistMessage(payload)
	if err != nil {
		client.Conn.WriteJSON(gin.H{
			"error": "failed to persist message",
		})
		return
	}

	broadcastToRoom(client.RoomID, gin.H{
		"type":    "receive_message",
		"message": savedMessage,
	})
}

func persistMessage(payload PersistMessagePayload) (any, error) {
	jsonData, err := json.Marshal(payload) // ← was: jsonData, _ = ...
    if err != nil {
        return nil, err
    }

	req, err := http.NewRequest(
		"POST",
		"http://localhost:3000/api/internal/messages",
		bytes.NewBuffer(jsonData),
	)

	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(
		"x-gateway-secret",
		os.Getenv("GATEWAY_SECRET"),
	)

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	var result PersistResponse

	err = json.NewDecoder(resp.Body).Decode(&result)

	if err != nil {
		return nil, err
	}

	return result.Message, nil
}

func broadcastToRoom(roomID string, payload any) {
	mutex.Lock()
	defer mutex.Unlock()

	roomClients := roomUsers[roomID]

	for client := range roomClients {
		err := client.Conn.WriteJSON(payload)

		if err != nil {
			log.Println("broadcast error:", err)
			client.Conn.Close()
			delete(roomClients, client)
		}
	}
}

func leaveRoomLocked(client *Client) {
    if client.RoomID == "" {
        return
    }

    roomID := client.RoomID

    if roomUsers[roomID] != nil {
        delete(roomUsers[roomID], client)

        if len(roomUsers[roomID]) == 0 {
            delete(roomUsers, roomID)
        }
    }

    client.RoomID = ""
    log.Printf("User %s left room %s\n", client.UserID, roomID)
}