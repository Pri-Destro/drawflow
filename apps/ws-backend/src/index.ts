import { WebSocketServer,WebSocket } from 'ws';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET }  from "@repo/backend-common/config";
import {prismaClient} from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });


interface Users{
  ws : WebSocket,
  rooms : String[],
  userId : String
}

const users : Users[] = [];

function checkUser(token : string) : string | null{
  try{
      const decoded = jwt.verify(token,JWT_SECRET) as JwtPayload

      if(!decoded || !decoded.userId) return null;
      const userId = decoded.userId
      
      return userId

  }catch(e){
    console.log("Error on verifying user")
    return null
  }

}

// request comes when new websocket is initialized with url
wss.on('connection', function connection(ws,request) {

  const url = request.url;
  if(!url) return;

  const queryParams = new URLSearchParams(url.split('?')[1]);
  const token = queryParams.get('token') || "";
  // console.log("this is token", token)
  // verifying user 
  const userId = checkUser(token);

  if(userId == null) {
    ws.close()
    return null
  }

  users.push({    // on every connection req each userId/user gets pushed to users 
    userId,
    rooms : [],
    ws 
  })

  ws.on('message', async function message(data) {

    const parsedData = JSON.parse(data as unknown as string)  // data will be of {type : "join room", roomId : room1}
    
    // ws on open
    if(parsedData.type === "join_room"){
      console.log("join room requested")
      const user = users.find(x => x.ws === ws)   // user whose ws cnx is curernt ws cnx
      user?.rooms.push(parsedData.roomId)
      console.log("roomid pushed in user rooms")
    }

    if(parsedData.type == "leave_room"){
      const user = users.find(x => x.ws === ws)

      if(!user) return;

      user.rooms = user?.rooms.filter(x => x !== parsedData.room)
    }

    if(parsedData.type == "chat"){            // data will be like {type : chat, message : hi, roomId : 123}
      const roomId = parsedData.roomId;
      const message = parsedData.message;

      await prismaClient.chat.create({        // (temp approach) messages will first store in db then it will broadcast
        data : {
          roomId,
          message,
          userId
          
        }
      })

      users.forEach(user => {
        if(user.rooms.includes(roomId)){
          user.ws.send(JSON.stringify({
            type : "chat",
            message : message,
            roomId
          }))
        }
      })
    }

    if(parsedData.type == "element"){            
      console.log("saving element to db from ws-backend")
      // data will be like {type: "element", roomId: "123", element: {type: "rect", x: 10, y: 20, width: 100, height: 50, style: {...}}}
      const roomId = parsedData.roomId;
      const { type, x, y, width, height, angle, style, data } = parsedData.element;

      // Create element in database
      const savedElement = await prismaClient.element.create({
        data: {
          type,
          x,
          y,
          width: width || null,
          height: height || null,
          angle: angle || 0,
          style: style || null,
          data: data || null,
          roomId : roomId,
          userId
        }
      });
      console.log("saved to db")

      // Broadcast to all users who are in the room
      users.forEach(user => {
        if(user.rooms.includes(roomId)){      
          user.ws.send(JSON.stringify({
            type: "element",
            element: {
              id: savedElement.id,
              type: savedElement.type,
              x: savedElement.x,
              y: savedElement.y,
              width: savedElement.width,
              height: savedElement.height,
              angle: savedElement.angle,
              style: savedElement.style,
              data: savedElement.data,
              userId: savedElement.userId,
              createdAt: savedElement.createdAt
            },
            roomId
          }))
        }
      })
    }
    
  });

  ws.on('close', () => {
    const index  = users.findIndex(x => x.ws === ws)
    if(index !== -1){
      users.splice(index, 1)
    }
  })

});