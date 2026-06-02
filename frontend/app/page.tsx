'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('token');
    router.replace(token ? '/chat' : '/login');
  }, [router]);
  return null;
}
