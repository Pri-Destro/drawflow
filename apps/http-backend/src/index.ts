import express from "express"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import { middleware } from "./middleware";
import {JWT_SECRET}  from "@repo/backend-common/config"; 
import {CreateUserSchema, SigninSchema, CreateRoomSchema} from "@repo/common/types";
import {prismaClient} from "@repo/db/client"
import cors from "cors"

const app = express();
app.use(express.json())
app.use(cors({
    credentials : true
}))

app.post("/signup", async (req,res) => {
    
    const parsedData = CreateUserSchema.safeParse(req.body);

    if(!parsedData.success){
        res.status(400).json({
            error : parsedData.error.issues 
        })
        return
    }

    const hashedPassword = await bcrypt.hash(parsedData.data.password, 10)

    try{        
        const user = await prismaClient.user.create({
            data : {
                email : parsedData.data.email,
                password : hashedPassword,
                name : parsedData.data.name
            }
        })

        
        if(!user){
            res.json({
                message : "Not authorized"
            })
        }

        res.json({
            email : user.email,
            name : user.name
        })
    }catch(e){
        console.log(e)
        res.status(403).json({
            message : "Error at db"
        })
    }

})

app.post("/signin", async (req,res) => {

    const parsedData = SigninSchema.safeParse(req.body);

    if(!parsedData.success){
        return res.status(400).json({
            error : "Invalid data"
        })
    }

    const email = parsedData.data.email;
    const password = parsedData.data.password;

    try{
        const user = await prismaClient.user.findUnique({
            where : {email : email},
        })

        if (!user) return res.json({ error: "User not found" })
    
        const isPasswordValid = await bcrypt.compare(password,user.password)

        if(!isPasswordValid) return res.json({error : "Incorrect credentials"})

        const token = jwt.sign(
            {
            userId : user.id,
            email: user.email,
            name: user.name,
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
    
        res.status(200).json({
            message: "Signin successful",
            token,
            user: {
            email: user.email,
            name: user.name,
            },
        });

    }catch(error){
        console.log("error at backend",error)
        res.status(500).json({ message: "Internal Server Error" });
    }
})


app.post("/room",middleware, async (req,res)=>{

    const parsedData = CreateRoomSchema.safeParse(req.body);
 
    if(!parsedData.success){
        res.status(400).json({
            error : "Invalid data"
        })
        return;
    }

    //@ts-ignore
    const userId = req.userId //from middleware

    try{
        const room = await prismaClient.room.create({
            data : {
                slug : parsedData.data.roomName,
                adminId : userId
            }
        })
        res.json({
            roomId : room.id,
        })

    }catch(e){
        res.status(403).json({
            message : "Error at db"
        })
    }
    
})
 
//it returns existing chats on that rooomId
app.get("/chat/:roomId", async (req,res)=>{
    const roomId = req.params.roomId;

    const messages = await prismaClient.chat.findMany({
        where : {
            roomId : roomId
        },
        orderBy : {
            id : "desc"
        },
        take : 50
    })
    
    res.json({
        messages
    })
})

//it returns existing shapes on that rooomId
app.get("/elements/:roomId", async (req,res)=>{
    const roomId = req.params.roomId;

    try{
        const elements = await prismaClient.element.findMany({
            where : {
                roomId : roomId
            },
            orderBy : {
                id : "desc"
            },
            take : 50
        })

        res.json({
            elements
        })
    }catch(e){
        console.log("error at db call ", e)
        res.status(500)
    }

})

// returns the slug after getting roomId
app.get("/room/:slug", async (req,res)=>{
    const slug = req.params.slug;

    const room = await prismaClient.room.findFirst({
        where : {
            slug 
        }
    })

    res.json({
        room
    })
})

app.get("/rooms", middleware, async (req,res) => {

    //@ts-ignore
    const userId = req.userId
    try{
        const rooms = await prismaClient.room.findMany({
            where: {
                OR: [
                { adminId: userId },
                {
                    participants: {
                    some: { userId }
                    }
                }
                ]
            },
            include: {
                _count: {
                select: { participants: true }
                }
            }
        });

        const formatted = rooms.map(room => ({
            roomId: room.id,
            name: room.slug,                        
            createdAt: room.createdAt.toISOString(),
            collaborators: room._count.participants + 1,
            // admin: room.adminId
        }));

        return res.json({ rooms: formatted });

    }catch(err){
        console.error(err);
        res.status(500).json({message : "Failed to fetch rooms/projects"})
    }

})

app.listen(3001);
console.log("server started")