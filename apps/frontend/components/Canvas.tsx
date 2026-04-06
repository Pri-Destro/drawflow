"use client"

import { useRef, useEffect, useState, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { Button } from "@repo/ui/button";
import { HTTP_BACKEND } from "@/config";
import { Element } from "@repo/common/types";
import Link from "next/link";
import { ArrowDownLeft , Circle, Eraser, Minus, Square,  ZoomIn, ZoomOut, Maximize, Hand } from "lucide-react";


const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 3000;

const MIN_SCALE = 0.1
const MAX_SCALE = 5;

export default function Canvas({roomId, socket} : {roomId : string, socket : WebSocket}){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const shapesRef = useRef<Element[]>([]);
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{x: number; y: number} | null>(null);
    const previewShapeRef = useRef<Element | null>(null);
    const currentToolRef = useRef<Element["type"]>("rect");
    const [currentTool, setCurrentTool] = useState<string>("rect");

    // canvas states
    const scaleRef = useRef(1);
    const offsetRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const panStartRef = useRef<{ x: number; y: number } | null>(null);
    const [scale, setScale] = useState(1);

    // convert screen coords to world coords
    const toWorld = useCallback((screenX: number, screenY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const canvasX = (screenX - rect.left) * (canvas.width / rect.width);
        const canvasY = (screenY - rect.top) * (canvas.height / rect.height);
        return {
            x: (canvasX - offsetRef.current.x) / scaleRef.current,
            y: (canvasY - offsetRef.current.y) / scaleRef.current,
        };
    }, []);
    
    const drawArrow = useCallback((ctx: CanvasRenderingContext2D, points: number[], currentScale : number) => {
        if (points.length < 4) return;
        const [x1, y1, x2, y2] = points;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 10 / currentScale;

        // normal line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // arrow head
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        // left side of arrow head
        ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        // right side of arrow head
        ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        // fill triagnle
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
        ctx.lineWidth = strokeWidth / scaleRef.current;

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
            drawArrow(ctx, shape.points, scaleRef.current);
        }

        ctx.restore();
    }, [drawArrow]);

    const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const s = scaleRef.current;
        const ox = offsetRef.current.x;
        const oy = offsetRef.current.y;

        // Adaptive grid spacing: smaller grid zooms into larger grid
        const baseSpacing = 50;
        let gridSpacing = baseSpacing;
        while (gridSpacing * s < 20) gridSpacing *= 5;
        while (gridSpacing * s > 150) gridSpacing /= 5;

        const scaledSpacing = gridSpacing * s;

        // Calculate grid start so it tiles correctly as you pan
        const startX = ((ox % scaledSpacing) + scaledSpacing) % scaledSpacing;
        const startY = ((oy % scaledSpacing) + scaledSpacing) % scaledSpacing;

        ctx.save();
        ctx.strokeStyle = "rgba(80,80,80,0.4)";
        ctx.lineWidth = 0.5;

        for (let x = startX; x <= canvas.width; x += scaledSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = startY; y <= canvas.height; y += scaledSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }, []);

    // main re-render logic
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(30,30,30,1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw infinite grid
        drawGrid(ctx, canvas);

        // Apply pan + zoom transform — all shapes are drawn in world space
        ctx.save();
        ctx.translate(offsetRef.current.x, offsetRef.current.y);
        ctx.scale(scaleRef.current, scaleRef.current);

        shapesRef.current.forEach((shape) => drawShape(ctx, shape));
        if (previewShapeRef.current) {
            drawShape(ctx, previewShapeRef.current);
        }
        ctx.restore();

    }, [drawShape, drawGrid]);

    // changing tools
    useEffect(() => {
        currentToolRef.current = currentTool as Element["type"] | "pan";
    }, [currentTool]);

    // fetching old elements and listening for new
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
            if (message.type === "clear") {
                shapesRef.current = [];
                previewShapeRef.current = null;
                redraw();
                return;
            }
            
            if (message.type !== "element") return;

            const shape = normalizeElement(message.element);
            if (!["rect", "circle", "ellipse", "arrow", "line"].includes(shape.type)) return;

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

    // coordinates calculating and mouse event handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // screen coordinates to canvas coordinates
        // const getPos = (clientX: number, clientY: number) => {
        //     const rect = canvas.getBoundingClientRect();
        //     const scaleX = canvas.width / rect.width;
        //     const scaleY = canvas.height / rect.height;
        //     return {
        //         x: (clientX - rect.left) * scaleX,
        //         y: (clientY - rect.top) * scaleY
        //     };
        // };

        const buildShape = (startX: number, startY: number, x: number, y: number): Element => {
            // const width = x - startX;
            // const height = y - startY;
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
                width : x - startX,
                height : y - startY,
                style: {
                    strokeColor: "rgba(255,255,255)",
                    strokeWidth: 1,
                    opacity: 1
                }
            };
        };

        const onMouseDown = (e: MouseEvent) => {
            const tool = currentToolRef.current as string;

            if (tool === "pan" || e.button === 1) { // Middle mouse or pan tool
                isPanningRef.current = true;
                panStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
                canvas.style.cursor = "grabbing";
                return;
            }

            const worldPos = toWorld(e.clientX, e.clientY);
            isDrawingRef.current = true;
            startPointRef.current = worldPos;
            previewShapeRef.current = null;
        };

        // live preview
        const onMouseMove = (e: MouseEvent) => {
            if (isPanningRef.current && panStartRef.current) {
                offsetRef.current = {
                    x: e.clientX - panStartRef.current.x,
                    y: e.clientY - panStartRef.current.y,
                };
                redraw();
                return;
            }

            if (!isDrawingRef.current || !startPointRef.current) return;
            const worldpos = toWorld(e.clientX, e.clientY);
            const start = startPointRef.current;
            previewShapeRef.current = buildShape(start.x, start.y, worldpos.x, worldpos.y);
            redraw();
        }; 


        const onMouseUp = (e: MouseEvent) => {
            if (isPanningRef.current) {
                isPanningRef.current = false;
                panStartRef.current = null;
                canvas.style.cursor = currentToolRef.current === "pan" ? "grab" : "crosshair";
                return;
            }

            if (!isDrawingRef.current || !startPointRef.current) return;
            const worldpos = toWorld(e.clientX, e.clientY);
            const start = startPointRef.current;
            const newShape = buildShape(start.x, start.y, worldpos.x, worldpos.y);

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
            // if (isPanningRef.current) {
            //     isPanningRef.current = false;
            //     panStartRef.current = null;
            // }

            if (!isDrawingRef.current) return;

            isDrawingRef.current = false;
            startPointRef.current = null;
            previewShapeRef.current = null;
            redraw();
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();

            // Cursor position in canvas pixels
            const cursorX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const cursorY = (e.clientY - rect.top) * (canvas.height / rect.height);

            const delta = -e.deltaY * 0.005;
            const zoomFactor = 1 + delta; 
            const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * zoomFactor));

            // Adjust offset so the point under the cursor stays fixed
            offsetRef.current = {
                x: cursorX - (cursorX - offsetRef.current.x) * (newScale / scaleRef.current),
                y: cursorY - (cursorY - offsetRef.current.y) * (newScale / scaleRef.current),
            };

            scaleRef.current = newScale;
            setScale(newScale); // Trigger re-render for zoom indicator
            redraw();
        };

        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseleave", onMouseLeave);
        canvas.addEventListener("wheel", onWheel, { passive: false });
        redraw();

        return () => {
            canvas.removeEventListener("mousedown", onMouseDown);
            canvas.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            canvas.removeEventListener("mouseleave", onMouseLeave);
            canvas.removeEventListener("wheel", onWheel);
        };
    }, [roomId, socket, redraw]);

    const handleClear = () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "clear",
                roomId
            }));
        }
        shapesRef.current = [];
        previewShapeRef.current = null;
        redraw();
    };
    
    const handleZoomIn = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const newScale = Math.min(MAX_SCALE, scaleRef.current * 1.2);
        offsetRef.current = {
            x: cx - (cx - offsetRef.current.x) * (newScale / scaleRef.current),
            y: cy - (cy - offsetRef.current.y) * (newScale / scaleRef.current),
        };
        scaleRef.current = newScale;
        setScale(newScale);
        redraw();
    };

    const handleZoomOut = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const newScale = Math.max(MIN_SCALE, scaleRef.current / 1.2);
        offsetRef.current = {
            x: cx - (cx - offsetRef.current.x) * (newScale / scaleRef.current),
            y: cy - (cy - offsetRef.current.y) * (newScale / scaleRef.current),
        };
        scaleRef.current = newScale;
        setScale(newScale);
        redraw();
    };

    const handleResetView = () => {
        scaleRef.current = 1;
        offsetRef.current = { x: 0, y: 0 };
        setScale(1);
        redraw();
    };

    return (
        <div className="min-h-screen bg-black no-scrollbar">
            <div className="relative mx-auto w-full max-w-[1520px] overflow-x-auto">
                <div className="pointer-events-none absolute left-1/2 top-3 z-10 w-[calc(100%-1.5rem)] -translate-x-1/2 sm:top-4 sm:w-auto">
                    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-black/90 p-2 shadow-2xl sm:justify-start">
                        <Button
                            className="bg-neutral-700 text-white hover:bg-neutral-600"
                            variant={"default"}
                            onClick={handleClear}
                            title="Clear canvas"
                            aria-label="Clear canvas"
                        >
                            <Eraser className="h-4 w-4" />
                        </Button>

                        <Button
                            className={currentTool === "rect" ? "border-cyan-400 bg-cyan-500 text-black hover:bg-cyan-400" : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"}
                            variant={"outline"}
                            size="icon"
                            onClick={() => setCurrentTool("rect")}
                            title="Rectangle"
                            aria-label="Rectangle tool"
                        >
                            <Square className="h-4 w-4" />
                        </Button>

                        <Button
                            className={currentTool === "circle" ? "border-cyan-400 bg-cyan-500 text-black hover:bg-cyan-400" : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"}
                            variant={"outline"}
                            size="icon"
                            onClick={() => setCurrentTool("circle")}
                            title="Circle"
                            aria-label="Circle tool"
                        >
                            <Circle className="h-4 w-4" />
                        </Button>

                        <Button
                            className={currentTool === "ellipse" ? "border-cyan-400 bg-cyan-500 text-black hover:bg-cyan-400" : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"}
                            variant={"outline"}
                            size="icon"
                            onClick={() => setCurrentTool("ellipse")}
                            title="Ellipse"
                            aria-label="Ellipse tool"
                        >
                            {/* <Ellipsis className="h-4 w-4" /> */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-ellipse-icon lucide-ellipse h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"  ><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>
                        </Button>

                        <Button
                            className={currentTool === "arrow" ? "border-cyan-400 bg-cyan-500 text-black hover:bg-cyan-400" : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"}
                            variant={"outline"}
                            size="icon"
                            onClick={() => setCurrentTool("arrow")}
                            title="Arrow"
                            aria-label="Arrow tool"
                        >
                            <ArrowDownLeft  className="h-4 w-4" />
                        </Button>

                        <Button
                            className={currentTool === "line" ? "border-cyan-400 bg-cyan-500 text-black hover:bg-cyan-400" : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"}
                            variant={"outline"}
                            size="icon"
                            onClick={() => setCurrentTool("line")}
                            title="Line"
                            aria-label="Line tool"
                        >
                            <Minus className="h-4 w-4" />
                        </Button>

                        {/* Pan tool */}
                        <Button
                            className={currentTool === "pan" ? "border-cyan-400 bg-cyan-500 text-black hover:bg-cyan-400" : "border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"}
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentTool("pan")}
                            title="Pan (or hold Space)"
                        >
                            <Hand className="h-4 w-4"/>
                        </Button>

                        <div className="mx-1 h-6 w-px bg-neutral-700" />

                        <Button className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800" variant="outline" size="icon" onClick={handleZoomOut} title="Zoom out">
                            <ZoomOut className="h-4 w-4" />
                        </Button>

                        <span className="min-w-[44px] text-center text-xs text-neutral-400">
                            {Math.round(scale * 100)}%
                        </span>

                        <Button className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800" variant="outline" size="icon" onClick={handleZoomIn} title="Zoom in">
                            <ZoomIn className="h-4 w-4" />
                        </Button>

                        <Button className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800" variant="outline" size="icon" onClick={handleResetView} title="Reset view">
                            <Maximize className="h-4 w-4" />
                        </Button>

                        <div className="mx-1 h-6 w-px bg-neutral-700" />
                        <Button className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800" variant={"outline"}>
                            <Link href={"/dashboard"} className="inline-flex items-center gap-2">
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>

                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    style={{ cursor: currentTool === "pan" ? "grab" : "crosshair" }}
                    className=" block border border-neutral-800 bg-neutral-900 sm:mt-24"
                />
            </div>
        </div>
    );
}