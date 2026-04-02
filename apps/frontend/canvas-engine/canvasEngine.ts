// import { RoomParticipants, Element } from "@repo/common/types";
// import { SelectionController } from "./SelectionController";
// type WebSocketConnection = {
//   connectionId: string;
//   connected: boolean;
// };

// export class CanvasEngine{
//     private canvas : HTMLCanvasElement;
//     private ctx : CanvasRenderingContext2D;
//     private roomId : string | null;
//     private userId : string | null;
//     private email : string | null;
//     private onScaleChangeCallback: (scale : number) => void;
//     private onParticipantsUpdate : | ((participants : RoomParticipants[]) => void) | null;
//     private onConnectionChange : ((isConnected : boolean) => void) | null;
//     private onShapeCountChange: ((count: number) => void) | null = null;

//     private token : string | null;
//     // public setOnShapeCountChange(callback: (count: number) => void) {
//     //     this.onShapeCountChange = callback;
//     // }

//     // private selectedShape: Shape | null = null;
//     private existingShapes: Element[];
//     // private SelectionController: SelectionController;

//     private socket: WebSocket | null = null;
//     private isConnected = false;
//     private participants: RoomParticipants[] = [];

//     private connectionId: string | null = null;
//     private myConnections: WebSocketConnection[] = [];

//     private cavasBgColor : string;
//     private clicked: boolean = false;
//     public outputScale: number = 1;
//     private activeTool: Element["type"] = "rect";
//     private startX: number = 0;
//     private startY: number = 0;
//     private panX: number = 0;
//     private panY: number = 0;
//     private scale: number = 1;
//     private strokeWidth: number = 1;
//     private strokeFill: string = "rgba(255, 255, 255)";
//     // private bgFill: string = "rgba(18, 18, 18)";
//     // private strokeStyle: StrokeStyle = "solid";
//     // private fontFamily: FontFamily = "hand-drawn";
//     // private fontSize: FontSize = "Medium";
//     // private textAlign: TextAlign = "left";


//     constructor(
//     canvas: HTMLCanvasElement,
//     roomId: string | null,
//     userId: string | null,
//     email: string | null,
//     token: string | null,
//     canvasBgColor: string,
//     onScaleChangeCallback: (scale: number) => void,
//     onParticipantsUpdate: ((participants: RoomParticipants[]) => void) | null,
//     onConnectionChange: ((isConnected: boolean) => void) | null,
//     // appTheme: "light" | "dark" | null
//   ) {

//     this.canvas = canvas;
//     this.ctx = canvas.getContext("2d")!;
//     this.cavasBgColor = canvasBgColor;
//     this.roomId = roomId;
//     this.userId = userId;
//     this.email = email;
//     this.onScaleChangeCallback = onScaleChangeCallback;
//     this.onParticipantsUpdate = onParticipantsUpdate;
//     this.onConnectionChange = onConnectionChange;
//     this.token = token;
//     this.clicked = false;
//     this.existingShapes = [];

//     this.canvas.width = document.body.clientWidth;
//     this.canvas.height = document.body.clientHeight;

//     this.init();
//     this.initMouseHandler();

//     if (this.token && this.roomId) {
//       // console.log("✅Connecting to WebSocket…");
//       this.connectWebSocket();
//       // console.log("✅Connected to WebSocket…");
//     }
//   }
  


// }


import { Element } from "@repo/common/types";

type Tool = Element["type"];

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private shapes: Element[] = [];
  private activeTool: Tool = "rect";

  // Drawing state
  private isDrawing = false;
  private startX = 0;
  private startY = 0;

  // Canvas style
  private bgColor = "rgba(30, 30, 30)";
  private strokeColor = "rgba(255, 255, 255)";
  private strokeWidth = 1;

  // Callback fired when the user finishes drawing a shape
  public onShapeComplete: ((shape: Element) => void) | null = null;

  // Bound handler refs — needed so we can removeEventListener later
  private handleMouseDown = this.onMouseDown.bind(this);
  private handleMouseMove = this.onMouseMove.bind(this);
  private handleMouseUp = this.onMouseUp.bind(this);

  constructor(canvas: HTMLCanvasElement, bgColor?: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    if (bgColor) this.bgColor = bgColor;

    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;

    this.attachMouseListeners();
    this.render();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Switch the active drawing tool */
  setTool(tool: Tool) {
    this.activeTool = tool;
  }

  /** Add a single shape and re-render (e.g. from WebSocket) */
  addShape(shape: Element) {
    this.shapes.push(shape);
    this.render();
  }

  /** Replace all shapes at once (e.g. on initial load from backend) */
  setShapes(shapes: Element[]) {
    this.shapes = shapes;
    this.render();
  }

  /** Clear the canvas and redraw every shape in the array */
  render() {
    const { ctx, canvas } = this;

    // Fill background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each committed shape
    this.shapes.forEach((shape) => this.drawShape(shape));
  }

  /** Remove all event listeners — call this on component unmount */
  destroy() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
  }

  // ─── Mouse Handlers ───────────────────────────────────────────────────────

  private onMouseDown(e: MouseEvent) {
    this.isDrawing = true;
    this.startX = e.offsetX;
    this.startY = e.offsetY;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDrawing) return;

    const width = e.offsetX - this.startX;
    const height = e.offsetY - this.startY;

    // Redraw committed shapes, then overlay the live preview
    this.render();
    this.drawPreview(this.startX, this.startY, width, height);
  }

  private onMouseUp(e: MouseEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const width = e.offsetX - this.startX;
    const height = e.offsetY - this.startY;

    // Ignore accidental clicks with no drag
    if (Math.abs(width) < 2 && Math.abs(height) < 2) return;

    const newShape: Element = {
      type: this.activeTool,
      x: this.startX,
      y: this.startY,
      width,
      height,
      style: {
        strokeColor: this.strokeColor,
        strokeWidth: this.strokeWidth,
        opacity: 1,
      },
    };

    this.shapes.push(newShape);
    this.render();

    // Let index.ts handle WebSocket + DB persistence
    this.onShapeComplete?.(newShape);
  }


  /** Draw the live rubber-band preview while the mouse is held down */
  private drawPreview(x: number, y: number, width: number, height: number) {
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.drawShapeGeometry(this.activeTool, x, y, width, height);
  }

  /** Draw a single committed shape with its stored style */
  private drawShape(shape: Element) {
    const { ctx } = this;
    ctx.strokeStyle = shape.style?.strokeColor ?? this.strokeColor;
    ctx.lineWidth = shape.style?.strokeWidth ?? this.strokeWidth;
    ctx.globalAlpha = shape.style?.opacity ?? 1;

    this.drawShapeGeometry(
      shape.type,
      shape.x,
      shape.y,
      shape.width ?? 0,
      shape.height ?? 0
    );

    ctx.globalAlpha = 1; // always reset after drawing
  }

  /** Pure geometry — no style setup here, callers set ctx style first */
  private drawShapeGeometry(
    type: Tool,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const { ctx } = this;

    if (type === "rect") {
      ctx.strokeRect(x, y, width, height);
      return;
    }

    if (type === "circle") {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  // ─── Internal Setup ───────────────────────────────────────────────────────

  private attachMouseListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
  }
}