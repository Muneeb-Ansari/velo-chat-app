import { useState } from "react";
import { api, usersApi } from "@/lib/api";

export function ProfileModal({ user, avatarUrl, onClose }: { user: any; avatarUrl?: string; onClose: () => void; }) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    console.log("Rendering ProfileModal with user:", avatarUrl);

    if (!user) return null;

    const getName = (name: string) =>
        (name || "User").slice(0, 2).toUpperCase();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const uploadAvatar = async (file: File) => {
        try {
            setLoading(true);

            const formData = new FormData();
            formData.append("avatar", file);

            await usersApi.update(user.id, formData);

            setFile(null);
            setPreview(null);
            onClose();

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>

                {/* AVATAR SECTION */}
                <div className="avatar-wrapper">

                    {preview ? (
                        <img src={preview} className="modal-avatar" />
                    ) : avatarUrl ? (
                        <img src={avatarUrl} className="modal-avatar" />
                    ) : (
                        <div className="modal-avatar-fallback">
                            {getName(user.username)}
                        </div>
                    )}

                    {/* EDIT ICON */}
                    <label className="edit-icon">
                        ✏️
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleFileChange}
                        />
                    </label>
                </div>

                <h3>{user.username}</h3>
                <p>{user.email}</p>

                {file && (
                    <button
                        className="save-btn"
                        disabled={loading}
                        onClick={() => uploadAvatar(file!)}
                    >
                        {loading ? "Uploading..." : "Save Changes"}
                    </button>
                )}

                <button className="close-btn" onClick={onClose}>
                    Close
                </button>

            </div>

            <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .modal {
          background: var(--bg2);
          padding: 22px;
          border-radius: 16px;
          width: 280px;
          text-align: center;
          border: 1px solid var(--border);
        }

        /* AVATAR WRAPPER */
        .avatar-wrapper {
          position: relative;
          width: 90px;
          height: 90px;
          margin: 0 auto 12px;
        }

        .modal-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
        }

        .modal-avatar-fallback {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 600;
          color: #fff;
          font-family: 'Syne', sans-serif;
        }

        /* EDIT ICON */
        .edit-icon {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          cursor: pointer;
          border: 1px solid var(--border);
        }

        h3 {
          margin: 8px 0 4px;
        }

        p {
          font-size: 12px;
          color: var(--text3);
        }

        .save-btn {
          margin-top: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: var(--accent);
          color: white;
          cursor: pointer;
        }

        .close-btn {
          margin-top: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          background: var(--bg3);
        }
      `}</style>
        </div>
    );
}