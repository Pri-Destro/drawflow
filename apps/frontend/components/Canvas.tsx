"use client"

import { useRef, useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { Button } from "@repo/ui/button";
import { HTTP_BACKEND } from "@/config";
import { Element } from "@repo/common/types";


const CANVAS_WIDTH = 1450;
const CANVAS_HEIGHT = 700;

export default function Canvas({roomId, socket} : {roomId : string, socket : WebSocket}){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const shapesRef = useRef<Element[]>([]);
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{x: number; y: number} | null>(null);
    const previewShapeRef = useRef<Element | null>(null);
    const currentToolRef = useRef<Element["type"]>("rect");
    const [currentTool, setCurrentTool] = useState<string>("rect");

    const drawArrow = useCallback((ctx: CanvasRenderingContext2D, points: number[]) => {
        if (points.length < 4) return;
        const [x1, y1, x2, y2] = points;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 10;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    }, []);

    const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Element) => {
        const strokeColor = shape.style?.strokeColor || "rgba(255,255,255,1)";
        const strokeWidth = shape.style?.strokeWidth || 1;
        const opacity = shape.style?.opacity ?? 1;
        const fill = shape.style?.backgroundColor;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        if (shape.type === "rect") {
            ctx.beginPath();
            ctx.rect(shape.x, shape.y, shape.width || 0, shape.height || 0);
            if (fill) {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            ctx.stroke();
        }

        if (shape.type === "circle") {
            const width = shape.width || 0;
            const height = shape.height || 0;
            const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
            ctx.beginPath();
            ctx.arc(shape.x + width / 2, shape.y + height / 2, radius, 0, Math.PI * 2);
            if (fill) {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            ctx.stroke();
        }

        if (shape.type === "ellipse") {
            const width = shape.width || 0;
            const height = shape.height || 0;
            ctx.beginPath();
            ctx.ellipse(
                shape.x + width / 2,
                shape.y + height / 2,
                Math.abs(width) / 2,
                Math.abs(height) / 2,
                0,
                0,
                Math.PI * 2
            );
            if (fill) {
                ctx.fillStyle = fill;
                ctx.fill();
            }
            ctx.stroke();
        }

        if (shape.type === "line" && shape.points) {
            if (shape.points.length >= 4) {
                ctx.beginPath();
                ctx.moveTo(shape.points[0], shape.points[1]);
                ctx.lineTo(shape.points[2], shape.points[3]);
                ctx.stroke();
            }
        }

        if (shape.type === "arrow" && shape.points) {
            drawArrow(ctx, shape.points);
        }

        ctx.restore();
    }, [drawArrow]);

    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(30,30,30,1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        shapesRef.current.forEach((shape) => drawShape(ctx, shape));
        if (previewShapeRef.current) {
            drawShape(ctx, previewShapeRef.current);
        }
    }, [drawShape]);

    useEffect(() => {
        currentToolRef.current = currentTool as Element["type"];
    }, [currentTool]);

    useEffect(() => {
        let mounted = true;

        const normalizeElement = (element: any): Element => {
            const points =
                element.points ||
                element.data?.points ||
                [];
            return {
                id: element.id,
                type: element.type,
                x: element.x,
                y: element.y,
                width: element.width || 0,
                height: element.height || 0,
                points,
                style: element.style || {
                    strokeColor: "rgba(255,255,255)",
                    strokeWidth: element.type === "arrow" || element.type === "line" ? 2 : 1,
                    opacity: 1
                }
            };
        };

        const fetchExistingElements = async () => {
            try {
                const res = await axios.get(`${HTTP_BACKEND}/elements/${roomId}`);
                const elements = Array.isArray(res.data?.elements) ? res.data.elements : [];
                if (!mounted) return;
                const normalizedShapes: Element[] = elements.map((element: any) => normalizeElement(element));
                shapesRef.current = normalizedShapes
                    .filter((shape: Element) => ["rect", "circle", "ellipse", "arrow", "line"].includes(shape.type));
                redraw();
            } catch (e) {
                console.error("Failed to fetch elements:", (e as AxiosError).message);
            }
        };

        const onMessage = (event: MessageEvent) => {
            const message = JSON.parse(event.data);
            if (message.type !== "element") return;

            const shape = normalizeElement(message.element);
            if (!["rect", "circle", "ellipse", "arrow", "line"].includes(shape.type)) {
                return;
            }

            shapesRef.current = [...shapesRef.current, shape];
            redraw();
        };

        fetchExistingElements();
        socket.addEventListener("message", onMessage);

        return () => {
            mounted = false;
            socket.removeEventListener("message", onMessage);
        };
    }, [roomId, socket, redraw]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getPos = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const buildShape = (startX: number, startY: number, x: number, y: number): Element => {
            const width = x - startX;
            const height = y - startY;
            const tool = currentToolRef.current;

            if (tool === "line" || tool === "arrow") {
                return {
                    type: tool,
                    x: startX,
                    y: startY,
                    points: [startX, startY, x, y],
                    style: {
                        strokeColor: "rgba(255,255,255)",
                        strokeWidth: 2,
                        opacity: 1
                    }
                };
            }

            return {
                type: tool,
                x: startX,
                y: startY,
                width,
                height,
                style: {
                    strokeColor: "rgba(255,255,255)",
                    strokeWidth: 1,
                    opacity: 1
                }
            };
        };

        const onMouseDown = (e: MouseEvent) => {
            const pos = getPos(e.clientX, e.clientY);
            isDrawingRef.current = true;
            startPointRef.current = pos;
            previewShapeRef.current = null;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDrawingRef.current || !startPointRef.current) return;
            const pos = getPos(e.clientX, e.clientY);
            const start = startPointRef.current;
            previewShapeRef.current = buildShape(start.x, start.y, pos.x, pos.y);
            redraw();
        }; 
        const onMouseUp = (e: MouseEvent) => {
            if (!isDrawingRef.current || !startPointRef.current) return;
            const pos = getPos(e.clientX, e.clientY);
            const start = startPointRef.current;
            const newShape = buildShape(start.x, start.y, pos.x, pos.y);

            isDrawingRef.current = false;
            startPointRef.current = null;
            previewShapeRef.current = null;

            shapesRef.current = [...shapesRef.current, newShape];
            redraw();

            if (socket.readyState === WebSocket.OPEN) {
                const payload = {
                    ...newShape,
                    data: newShape.points ? { points: newShape.points } : undefined
                };
                socket.send(JSON.stringify({
                    type: "element",
                    roomId,
                    element: payload
                }));
            }
        };

        const onMouseLeave = () => {
            if (!isDrawingRef.current) return;
            isDrawingRef.current = false;
            startPointRef.current = null;
            previewShapeRef.current = null;
            redraw();
        };

        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mousemove", onMouseMove);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseleave", onMouseLeave);
        redraw();

        return () => {
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("mouseup", onMouseUp);
            canvas.removeEventListener("mouseleave", onMouseLeave);
        };
    }, [roomId, socket, redraw]);

    const handleClear = () => {
        shapesRef.current = [];
        previewShapeRef.current = null;
        redraw();
    };

    return (
        <div className="">
            <div className="flex justify-center items-center bg-gray-300 py-2 gap-3"> 
                <Button 
                    className="bg-slate-600 text-white hover:bg-slate-800"
                    variant={"default"}
                    onClick={handleClear}
                > 
                    Clear 
                </Button>
                
                <Button 
                    className={currentTool === "rect" ? "bg-blue-500 text-white" : ""}
                    variant={"outline"}
                    onClick={() => setCurrentTool("rect")}
                > 
                    Rectangle
                </Button>
                
                <Button 
                    className={currentTool === "circle" ? "bg-blue-500 text-white" : ""}
                    variant={"outline"}
                    onClick={() => setCurrentTool("circle")}
                > 
                    Circle 
                </Button>

                <Button 
                    className={currentTool === "ellipse" ? "bg-blue-500 text-white" : ""}
                    variant={"outline"}
                    onClick={() => setCurrentTool("ellipse")}
                > 
                    Ellipse 
                </Button>

                <Button 
                    className={currentTool === "arrow" ? "bg-blue-500 text-white" : ""}
                    variant={"outline"}
                    onClick={() => setCurrentTool("arrow")}
                > 
                    Arrow 
                </Button>

                <Button 
                    className={currentTool === "line" ? "bg-blue-500 text-white" : ""}
                    variant={"outline"}
                    onClick={() => setCurrentTool("line")}
                > 
                    Line 
                </Button>
            </div>

            <div className="m-5 border-2 border-black">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="block bg-neutral-900"
                />
            </div>
        </div>
    );
}