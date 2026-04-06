"use client"

import { useState, useEffect } from "react"
import axios from 'axios'
import Canvas from "./Canvas"
import { WS_URL } from "@/config"
import { useRouter } from "next/navigation"
import { Loader2, WifiOff } from "lucide-react"

export default function RoomCanvas({roomId } : {roomId : string}){

        const [socket, setSocket] = useState<WebSocket | undefined>()
        const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
        const [error, setError] = useState("")
        const router = useRouter();

        useEffect(() => {
            const initSocket = async () => {
            try {
                const res = await axios.get("/api/auth/getToken")
                if(res.status === 401){
                    setError("Unauthorized access")
                    router.push("/signin")
                    return 
                }
                
                const token = res.data.token
                const ws = new WebSocket(`${WS_URL}?token=${token}`)
                // console.log(token);
                ws.onopen = () => {
                console.log(" WebSocket connected");
                setSocket(ws)
                setConnectionStatus("connected")
                ws.send(
                    JSON.stringify({
                    type: "join_room",
                    roomId,
                    })
                )
                }

                ws.onerror = (error) => {
                console.error(" WebSocket error:", error);
                setConnectionStatus("error")
                }

                ws.onclose = (event) => {
                console.warn(" WebSocket closed:", event.code, event.reason);
                setConnectionStatus("error")
                }

                return () => {
                    ws.close();
                };
                
            } catch (err) {
                console.log("Error initializing WebSocket:", err)
                setConnectionStatus("error")
            }
            
            }

            initSocket()


        }, [roomId])
        
    if (connectionStatus === 'error') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
                <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-lg">
                    <WifiOff className="mx-auto mb-3 h-8 w-8 text-red-500" />
                    <h2 className="text-lg font-semibold text-slate-900">Connection failed</h2>
                    <p className="mt-1 text-sm text-slate-600">Please refresh and try joining the room again.</p>
                </div>
            </div>
        )
    }
    
    if (connectionStatus === 'connecting') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-700" />
                    <h2 className="text-lg font-semibold text-slate-900">Connecting to room</h2>
                    <p className="mt-1 text-sm text-slate-600">Setting up your collaborative canvas session...</p>
                </div>
            </div>
        )
    }
    
    if (!socket) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-700" />
                    <h2 className="text-lg font-semibold text-slate-900">Initializing</h2>
                    <p className="mt-1 text-sm text-slate-600">Preparing the canvas environment...</p>
                </div>
            </div>
        )
    }
    
    return <div>
        <Canvas roomId={roomId} socket = {socket}/>
        </div>
}