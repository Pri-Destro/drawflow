import {z} from "zod";

export const CreateUserSchema = z.object({
    name : z.string(),
    password : z.string().min(8),
    email : z.email(),
})

export const SigninSchema = z.object({
    password : z.string().min(8),
    email : z.email(),
})

export const CreateRoomSchema = z.object({
    roomName : z.string().min(3)
})

export type Project = {
    roomId : string,
    name : string,
    collaborators? : number,
    admin? : string,
    createdAt? : string
} 

export type User = {
    name : string,
    email : string
}

export interface Room {
  id: number;
  name: string;
}

export type RoomParticipants = {
  userId: string;
  userName: string;
};

export type Element = {
    id?: string;
    type: "rect" | "circle" | "ellipse" | "arrow" | "line" | "pan";
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: number[];
    style?: {
        strokeColor?: string;
        backgroundColor?: string;
        strokeWidth?: number;
        opacity?: number;
    };
};

export enum WsDataType {
  JOIN = "JOIN",
  LEAVE = "LEAVE",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
  DRAW = "DRAW",
  ERASER = "ERASER",
  UPDATE = "UPDATE",
  EXISTING_PARTICIPANTS = "EXISTING_PARTICIPANTS",
  CLOSE_ROOM = "CLOSE_ROOM",
  CONNECTION_READY = "CONNECTION_READY",
  EXISTING_SHAPES = "EXISTING_SHAPES",
  STREAM_SHAPE = "STREAM_SHAPE",
  STREAM_UPDATE = "STREAM_UPDATE",
  CURSOR_MOVE = "CURSOR_MOVE",
}
