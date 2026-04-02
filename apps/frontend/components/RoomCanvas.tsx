"use client"

import { useState, useEffect } from "react"
import axios from 'axios'
import Canvas from "./Canvas"
import { WS_URL } from "@/config"
import { useRouter } from "next/navigation"

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
        return <div>Connection failed. Please refresh.</div>
    }
    
    if (connectionStatus === 'connecting') {
        return <div>Connecting to server...</div>
    }
    
    if (!socket) {
        return <div>Initializing connection...</div>
    }
    
    return <div>
        <Canvas roomId={roomId} socket = {socket}/>
        </div>
}