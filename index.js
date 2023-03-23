const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const app = express();
const socket = require("socket.io");

require("dotenv").config();
const port = process.env.PORT;

app.use(express.json());
app.use(cors({ origin: true, methods: "GET,HEAD,POST,PUT,PATCH,DELETE", credentials: true }));
app.use(cookieParser());

const Routes = require("./routes/index");

mongoose.connect(process.env.MONGODB_ATLAS_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err) => {
    if(err) console.log(err);
    else console.log("mongodb connected successfully");
});

app.use("/", Routes);

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const io = socket(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

let onlineUsers = [];

const getUser = (userId) => onlineUsers.find(user => user.id == userId);
const removeUser = (userId) => onlineUsers.filter(user => user.id !== userId);
const addUser = (userId, socketId) => !getUser(userId) && onlineUsers.push({socketId,userId});

io.on('connection', (socket) => {
    socket.on('userOnline', (data) => {
        addUser(data._id, socket.id);
        io.emit('updatedMyAccount', {...data, lastSeen: 'online'})
    });

    socket.on('sendLink', (data) => {
        io.emit('sentLink', {...data});
    });

    socket.on('forwardMessage', (data) => {
        io.emit('forwardedMessage', {...data});
    });
    
    socket.on('typingToOne', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user.socketId).emit('isTypingToYou', {...data})
    });

    socket.on('stopTypingToYou', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user.socketId).emit('stoppedTypingToYou', {...data});
    });

    socket.on('typingToGroup', (data) => {
        io.emit('isTypingToGroup', {...data})
    });

    socket.on('stopTypingToGroup', (data) => {
        io.emit('stoppedTypingToGroup', {...data})
    });

    socket.on('makeAdmin', (data) => {
        io.emit('madeAdmin', {...data});
    });

    socket.on('joinGroup', (data) => {
        io.emit('joinedGroup', {...data});
    });

    socket.on('addUsersToGroup', (data) => {
        io.emit('addedUsersToGroup', {...data});
    });

    socket.on('leaveGroup', (data) => {
        io.emit('leftGroup', {...data});
    });

    //when we receive action sendMessage from sender frontend
    //fire action sentMessageToYou on receiver frontend
    socket.on('sendMessage', (data) => {
        const user = getUser(data.receiver);
        if(!user) return;
        io.to(user.socketId).emit('sentMessageToYou', {...data});
    });

    socket.on('sendGroupMessage', (data) => {
        io.emit('sentGroupMessageToYou', {...data});
    })

    //when we are in chats home page
    //send action to senders to update
    //all the sender's message to delivered
    socket.on('receivedAllMessages', (data) => {
        for(var i=0;i<data.senders.length;i++) {
            const user = getUser(data.senders[i]);
            if(!user) return;
            io.to(user.socketId).emit('deliveredAllMessages', {receiver: data.receiver, sender: user.userId});
        }
    })

    //when we receive action receivedOneMessage from receiver frontend
    //fire action deliveredMessage on sender frontend, 
    //i.e message has been received by receiver so delivered on sender side
    socket.on('receivedOneMessage', (data) => {
        const user = getUser(data.sender);
        if(!user) return;
        io.to(user.socketId).emit('deliveredOneMessage', {
            receiver: data.receiver, 
            sender: user.userId, 
            messageId: data.messageId
        });
    })


    // receive action to openAllMessages on receiver frontend
    // fire action readAllMessages to display delivered on sender frontend
    socket.on('openedAllMessages', (data) => {
        const user = getUser(data.sender);
        if(!user) return;
        io.to(user.socketId).emit('readAllMessages', {...data});
    });

    socket.on('deleteMessageForAll', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user.socketId).emit('deletedMessageForAll', {...data});
    })

    socket.on('deleteGroupMessageForAll', (data) => {
        io.emit('deletedGroupMessageForAll', {...data})
    })

    socket.on('postReaction', (data) => {
        io.emit('receiveReaction', {...data});
    })

    //callType is either 'video' or 'audio'

    //receive action callingUser from caller frontend
    //fire action receivingCall in receiver frontend
    socket.on('callingUser', (data) => {
        const user = getUser(data.receiver);
        if(!user) return;
        io.to(user.socketId).emit('receivingCall', {
            signal: data.signal, from: data.from, to: data.to,
            callType: data.callType
        });
    });

    //receive action acceptedCall from receiver frontend
    //fire action callAccepted in caller frontend
    socket.on('acceptedCall', (data) => {
        const user = getUser(data.caller);
        if(!user) return;
        io.to(user.socketId).emit('callAccepted', {...data});
    });

    socket.on('userInCall', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user.socketId).emit('userInCall', {...data});
    })

    socket.on('endCall', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user.socketId).emit('endedCall', {...data});
    })

    socket.on('missCall', (data) => {
        const user = getUser(data.caller);
        if(!user) return;
        io.to(user.socketId).emit('missedCall',{...data});
    })

    //status
    
    //receive action sendStatus from sender frontend
    //fire action receiveStatus on all receiver frontend
    socket.on('sendStatus', (data) => {
        io.emit('receiveStatus', {...data});
    })

    //receive action viewStatus from viewer  frontend
    //fire action viewedStatus on sender frontend
    socket.on('viewStatus', (data) => {
        //data.id is the poster who needs to get update
        //that someone has viewed his status
        const user = getUser(data.to);
        if(!user) return;
        io.to(user.socketId).emit('viewedStatus', {...data})
    });

    //acountUpdates

    socket.on('updateMyAccount', (data) => {
        io.emit('updatedMyAccount', {...data});
    });

    socket.on('updateGroupAccount', (data) => {
        io.emit('updatedGroupAccount', {...data});
    })


    socket.on('disconnect', () => {
        const user = onlineUsers.find(u => u.socketId == socket.id);
        removeUser(user.userId);
        io.emit('updatedMyAccount', {
            _id: user.userId,
            lastSeen: String(new Date()),
        });
    });
});