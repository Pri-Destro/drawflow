import RoomCanvas from "@/components/RoomCanvas"

export default async function CanvasPage({params} : {params : {roomId : string}}){

    const roomId =  (await params).roomId
    console.log("Room ID:", roomId);
    // const canvasRef = useRef<HTMLCanvasElement>(null)
    // useEffect(()=>{   

    //     if(canvasRef.current){
    //         const canvas = canvasRef.current;
    //         initDraw(canvas, roomId)
    //     }
    // },[canvasRef])

    

    return <RoomCanvas roomId = {roomId} />
}