'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Login } from '@/components/attindo/login'
import { AppShell } from '@/components/attindo/app-shell'

export default function Home() {
  const { isAuthenticated } = useAppStore()

  if (!isAuthenticated) {
    return <Login />
  }

  return <AppShell />
}
