// import axios, { AxiosError } from "axios";
// import { HTTP_BACKEND, WS_URL } from "@/config";
// import { Element } from "@repo/common/types";

// // type Element = {
// //     id?: string;
// //     type: "rect";
// //     x: number;
// //     y: number;
// //     width: number;
// //     height: number;
// //     style?: {
// //         strokeColor?: string;
// //         backgroundColor?: string;
// //         strokeWidth?: number;
// //         opacity?: number;
// //     };
// // } | {
// //     id?: string;
// //     type: string;
// //     x: number;
// //     y: number;
// //     width: number;
// //     height: number;
// //     style?: {
// //         strokeColor?: string;
// //         backgroundColor?: string;
// //         strokeWidth?: number;
// //         opacity?: number;
// //     };
// // }


// export default async function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
//     const ctx = canvas.getContext('2d');

//     if (!ctx) return;

//     // updating elements coming from ws server in canvas
//     socket.onmessage = (event) => {
//         const message = JSON.parse(event.data);

//         if (message.type === "element") {
//             existingShapes.push(message.element);
//             clearCanvas(existingShapes, canvas, ctx);
//         }
//     }

//     // default canvas colour
//     ctx.fillStyle = "rgba(30,30,30)";                       
//     ctx.fillRect(0, 0, canvas.width, canvas.height);


//     let isDrawing = false;
//     let startX = 0;
//     let startY = 0;
//     let currentTool : "rect" | "circle" = "rect"; 
//     // already existing shapes in this room
//     const existingShapes: Element[] = await getExistingElements(roomId);

// // draw on mouse down
//     canvas.addEventListener('mousedown', (e) => {
//         isDrawing = true;
//         startX = e.offsetX;
//         startY = e.offsetY;
//     });
//     // 
// // add element when mouse up
//     canvas.addEventListener('mouseup', async (e) => {
//         if (!isDrawing) return;
        
//         isDrawing = false;

//         const width = e.offsetX - startX;
//         const height = e.offsetY - startY;

//         const newElement: Element = {
//             type: currentTool,
//             x: startX,
//             y: startY,
//             width,
//             height,
//             style: {
//                 strokeColor: "rgba(255,255,255)",
//                 strokeWidth: 1,
//                 opacity: 1
//             }
//         };

//         existingShapes.push(newElement);

//         try {
//             // Send to other users via WebSocket
//             if (socket.readyState === WebSocket.OPEN) {
//                 socket.send(JSON.stringify({
//                     type: "element",
//                     roomId,
//                     element: {
//                         ...newElement,
//                     }
//                 }));
//             }
//         } catch (error) {
//             console.error('Error saving element:', error);
//         }
//     });

//     canvas.addEventListener('mousemove', (e) => {
//         if (isDrawing) {
//             const width = e.offsetX - startX;
//             const height = e.offsetY - startY;

//             clearCanvas(existingShapes, canvas, ctx);

//             ctx.strokeStyle = "rgba(255,255,255)";
//             ctx.lineWidth = 1;
            
//             if (currentTool === "rect") {
//                 ctx.strokeRect(startX, startY, width, height);
//             } else if (currentTool === "circle") {
//                 const centerX = startX + width / 2;
//                 const centerY = startY + height / 2;
//                 const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
//                 ctx.beginPath();
//                 ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
//                 ctx.stroke();
//             }
//         }
//     });

//     // Initial render of existing shapes
//     clearCanvas(existingShapes, canvas, ctx);
// }

// // clear canvas and draw all existing shapes
// function clearCanvas(existingShapes: Element[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);  // clearing context
//     ctx.fillStyle = "rgba(30,30,30)";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     existingShapes.forEach((shape) => {
//         const strokeColor = shape.style?.strokeColor || "rgba(255,255,255)";
//         const strokeWidth = shape.style?.strokeWidth || 1;
//         const opacity = shape.style?.opacity || 1;

//         ctx.strokeStyle = strokeColor;
//         ctx.lineWidth = strokeWidth;
//         ctx.globalAlpha = opacity;
        
//         if (shape.type === "rect") {
//             ctx.strokeRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
//         } else if (shape.type === "circle") {
//             const centerX = shape.x + (shape.width ?? 0) / 2;
//             const centerY = shape.y + (shape.height ?? 0) / 2;
//             const radius = Math.min(shape.width ?? 0, shape.height ?? 0) / 2;
            
//             ctx.beginPath();
//             ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
//             ctx.stroke();
//         }
        
//         ctx.globalAlpha = 1; // Reset opacity
//     });
// }

// // Only fetch initial elements when user joins the room
// async function getExistingElements(roomId: string){
//     try {
//         console.log("Fetching from:", `${HTTP_BACKEND}/elements/${roomId}`);
//         const res = await axios.get(`${HTTP_BACKEND}/elements/${roomId}`);
//         console.log("Response:", res.data);

//         const elements = res.data.elements;
//         console.log(elements)
//         return elements.map((element: any) => ({
//             id: element.id,
//             type: element.type,
//             x: element.x,
//             y: element.y,
//             width: element.width || 0,
//             height: element.height || 0,
//             style: element.style || {
//                 strokeColor: "rgba(255,255,255)",
//                 strokeWidth: 1,
//                 opacity: 1
//             }
//         }));

//     } catch (e) {
//         console.error("Full error:", (e as AxiosError).response?.data || (e as AxiosError).message);
//         return [];
//     }
// }

import axios, { AxiosError } from "axios";
import { HTTP_BACKEND } from "@/config";
import { Element } from "@repo/common/types";
import { CanvasEngine } from "@/canvas-engine/canvasEngine";

export default async function initDraw(
  canvas: HTMLCanvasElement,
  roomId: string,
  socket: WebSocket
) {
  //  Load existing shapes from backend 
  const existingShapes = await getExistingElements(roomId);

  // ── 2. Boot the engine ────────────────────────────────────────────────────
  const engine = new CanvasEngine(canvas, "rgba(30, 30, 30)");
  engine.setShapes(existingShapes);

  // ── 3. When the user finishes drawing a shape → send it over WebSocket ────
  engine.onShapeComplete = (shape: Element) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "element",
          roomId,
          element: shape,
        })
      );
    }
  };

  // When a remote shape arrives via WebSocket → add it to the canvas
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "element") {
      engine.addShape(message.element);
    }
  };

  // Return engine so the caller can call engine.setTool(), engine.destroy(), etc.
  return engine;
}

async function getExistingElements(roomId: string): Promise<Element[]> {
  try {
    const res = await axios.get(`${HTTP_BACKEND}/elements/${roomId}`);
    return res.data.elements.map((el: any) => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width ?? 0,
      height: el.height ?? 0,
      style: el.style ?? {
        strokeColor: "rgba(255, 255, 255)",
        strokeWidth: 1,
        opacity: 1,
      },
    }));
  } catch (e) {
    console.error(
      "Failed to fetch elements:",
      (e as AxiosError).response?.data ?? (e as AxiosError).message
    );
    return [];
  }
}