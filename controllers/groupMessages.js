const sharp = require('sharp');
const { encode } = require('blurhash');
const axios = require('axios');
const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require("../models/Users");
const Groupchats = require("../models/Groupchats");
const GroupMessages = require("../models/GroupMessages");
const GroupDeletedMessages = require("../models/GroupDeletedMessages");
const { fastFindInDBData, binSearch, mergeSort } = require("../utils/Optimisers");
const cloudinary = require("../routes/cloudinary");
const { 
    isRead, getTime, sameDay, formatImagesTime,
    convertToBase64URL, convertToBuffer  
} = require("../utils/helpers");



exports.getAllUserGroupMessages = catchAsync(async (req, res) => {

    const allUsers = await Users.find();
    const user = fastFindInDBData(req.user.refId, allUsers);
    const { userGroups, refId } = user;
    const deletedMessages = await GroupDeletedMessages.find({ deletedBy: req.user.id });
    const userDeletedMessages = mergeSort(deletedMessages);

    let messages = await GroupMessages.find();
    const allGroups = await Groupchats.find();
    messages.reverse();

    let groupsInChatWith = new Map();
    let time = null;

    for(var i=0;i<messages.length;i++) {

        let { senderRefId, groupRefId, groupId, createdAt, _id } = messages[i];
        const groupData = userGroups.find(group => group == groupId);

        if(!groupData) continue;
        if(binSearch(_id, userDeletedMessages) != null) continue;

        const isSender = senderRefId == refId;

        let groupInChatWith = fastFindInDBData(groupRefId, allGroups);
        
        let { messagesData, unreadMessages } = groupsInChatWith.get(groupInChatWith._id) || {};
        const messageData = {
            ...messages[i],
            senderImg: fastFindInDBData(senderRefId, allUsers).img,
            time: !sameDay(time, createdAt) ? getTime(createdAt) : null
        }
        time = createdAt;

        if(messagesData) {
            groupsInChatWith.set(groupInChatWith._id, {
                account: groupInChatWith,
                unreadMessages: (!isSender && !isRead(groupData.lastView, createdAt)) ? (unreadMessages + 1) : unreadMessages,
                messagesData: [...messagesData, messageData]
            });
        } else {
            groupsInChatWith.set(groupInChatWith._id, {
                account: groupInChatWith,
                unreadMessages: (!isSender && !isRead(groupData.lastView, createdAt)) ? 1 : 0,
                messagesData: [messageData]
            });
        }
    }

    let chatsToSend = [];
    for(var chats of groupsInChatWith) chatsToSend.push(chats[1]);

    res.status(200).json({
        messages: chatsToSend,
        status: 'success'
    })
});

exports.getSpecificGroupMessages = catchAsync(async (req, res) => {

    //userLastView should be sent from frontend
    //it would have been extracted from userGroups in frontend
    const { targetGroupRefId, userLastView } = req.params;
    const { refId, id } = req.user;

    const allUsers = await Users.find();
    const group = await Groupchats.findOne({ groupRefId: targetGroupRefId });
    let messages = await GroupMessages.find();
    const deletedMessages = await GroupDeletedMessages.find({ deletedBy: req.user.id });
    const userDeletedMessages = mergeSort(deletedMessages);

    messages.reverse();
    let unReads = 0;

    let messagesToSend = [];
    let time = null;
    
    for(var i=0;i<messages.length;i++) {
        let { senderRefId, groupRefId, createdAt, _id } = messages[i];

        if(groupRefId != targetGroupRefId) continue;
        if(binSearch(_id, userDeletedMessages) != null) continue;

        const isSender = senderRefId == refId;

        if(!isSender && !isRead(userLastView, createdAt)) unReads++;
        
        const messageData = {
            ...messages[i],
            senderImg: fastFindInDBData(senderRefId, allUsers).img,
            time: !sameDay(time, createdAt) ? getTime(createdAt) : null
        }
        time = createdAt;

        messagesToSend.push(messageData);
    }

    await GroupMessages.updateMany(
        {groupRefId: targetGroupRefId},
        {$push: {"isReadBy": {
            refId, id, time: String(new Date())
        }}}
    )

    res.status(200).json({
        account: group._doc,
        messages: messagesToSend,
        unReads,
        status: 'success'
    })
});

exports.readGroupMessages = catchAsync(async (req, res) => {
    await GroupMessages.updateMany(
        {groupRefId: req.params.targetRefId},
        {$push: {"isReadBy": {
            refId: req.user.refId,
            id: req.user.id,
            time: String(new Date())
        }}}
    )
});

//when we leave group page
//update the time
//cause messages that enter after now
//have not been seen by user
exports.leftGroupPage = catchAsync(async (req, res) => {
    const user = await Users.findById(req.user.id);
    let { userGroups } = user._doc;
    const { targetGroupRefId } = req.params;
    for(var i=0;i<userGroups.length;i++) {
        if(userGroups[i].groupRefId == targetGroupRefId) {
            userGroups[i].lastView = String(new Date());
            break;
        }
    }
    const newUserData = await Users.findByIdAndUpdate(req.user.id, {userGroups}, { new: true });
    res.status({
        status: 'success',
        user: newUserData
    })
});

exports.sendGroupMessage = catchAsync(async (req, res) => {
    const { images } = req.body;
    let imagesData = [];
    for(var i=0;i<images.length;i++) {
        const base64 = await convertToBase64URL(images[i]);
        const { public_id, secure_url } = await cloudinary.uploader.upload(
            base64, { folder: "/MyChat/messages", public_id: images[i].name }
        );
        const buffer = convertToBuffer(base64);
        const { data, info } = await sharp(buffer)
            .ensureAlpha().raw()
            .toBuffer({ resolveWithObject: true });
        const encoded = encode(data, info.width, info.height, 4, 4);
        imagesData.push({ public_id, value: secure_url, hash: encoded });
    }
    const newMessage = new GroupMessages({
        ...req.body, senderRefId: req.user.refId, 
        senderId: req.user.id, images: imagesData
    });
    await newMessage.save();
    res.status(200).json({
        status: 'success',
        message: "Message sent successfully",
        messageData: newMessage?._doc||newMessage
    })
});

exports.deleteGroupMessagesForMe = catchAsync(async (req, res) => {
    const { messagesToDelete } = req.body;
    const { id } = req.user;
    for(var i=0;i<messagesToDelete.length;i++) {
        const newDeleted = new GroupDeletedMessages({
            messageId: messagesToDelete[i]._id,
            deletedBy: id,
        });
        await newDeleted.save();
    }
    
    res.status(200).json({
        status: 'success',
        message: `Message${messagesToDelete.length > 1 ? "s" : ""} deleted successfully`
    })
})

exports.deleteOneGroupMessageForAll = catchAsync(async (req, res) => {
    const message = await GroupMessages.findByIdAndDelete(req.params.messageId);
    const { images } = message._doc;
    if(images.length == 1 && images[0]?.public_id) await cloudinary.uploader.destroy(images[0]?.public_id);
    await GroupDeletedMessages.findOneAndDelete({ messageId: req.params.messageId, deletedBy: req.user.id });

    res.status(200).json({
        status: 'success',
        message: 'Message deleted for all successfully'
    })
})

//req.body.messages, contains all messages id we want to update
exports.deleteAllGroupMessagesForMe = catchAsync(async (req, res) => {

    const { id } = req.user;
    const messagesToDelete = await GroupMessages.find({ groupRefId: req.params.targetGroupRefId });
    for(var i=0;i<messagesToDelete.length;i++) {
        const newDeleted = new GroupDeletedMessages({
            messageId: messagesToDelete[i]._id,
            deletedBy: id,
        });
        await newDeleted.save();
    }
    
    res.status(200).json({
        status: 'success',
        message: `All chats cleared successfully`
    })
});

exports.getAllGroupMessageReaders = catchAsync(async (req, res) => {
    const allUsers = await Users.find();
    const message = await GroupMessages.findById(req.params.id);
    const readersData = [];
    const { isReadBy } = message._doc;
    const { contacts } = fastFindInDBData(req.user.refId, allUsers);
    for(var i=0;i<isReadBy.length;i++) {
        const acct = fastFindInDBData(isReadBy[i].refId, allUsers);
        readersData.push({
            name: contacts.find(c => c.userId == isReadBy[i].id)?.userName||acct.phoneNumber,
            img: acct.img,
            time: isReadBy[i].time
        });
    }
    res.status(200).json({
        status: 'success',
        message: 'Retrieved data successfully',
        readers: readersData,
    })
});

exports.fetchGroupAccount = catchAsync(async (req, res) => {
    const group = await Groupchats.findById(req.params.id);
    res.status(200).json({
        group: group._doc,
        status: 'success',
        message: 'Fetched group data successfully'
    })
});

exports.fetchGroupImagesAndParticipants = catchAsync(async (req, res) => {
    const allUsers = await Users.find();
    const group = await Groupchats.findById(req.params.id);
    const { contacts } = fastFindInDBData(req.user.id, allUsers);
    const {participants } = group._doc;
    let participantsData = [];
    let Images = [];  
    let messages = await GroupMessages.find();
    const deletedMessages = await GroupDeletedMessages.find({ deletedBy: req.user.id });
    const userDeletedMessages = mergeSort(deletedMessages);

    messages.reverse();
    for(var i=0;i<messages.length;i++) {
        let { groupRefId, senderId, createdAt, _id, senderRefId, images } = messages[i];

        if(groupRefId != targetGroupRefId) continue;
        if(binSearch(_id, userDeletedMessages) != null) continue;
        
        if(images.length > 0) {
            const acct = fastFindInDBData(senderRefId, allUsers);
            for(var j=0;j<images.length;j++) {
                Images.push({
                    img: images[j],
                    senderImg: acct?.img,
                    senderName: contacts.find(u => u.userId == senderId)?.userName||acct.userName,
                    senderNumber: acct.phoneNumber,
                    time: formatImagesTime(createdAt),
                });
            }
        };
    }
    for(var i=0;i<participants.length;i++) {
        const acct = fastFindInDBData(participants[i].refId, allUsers);
        acct.name = contacts.find(c => c.userId == acct._id)?.userName||acct.userName;
        acct.admin = participants[i].admin;
        participantsData.push(acct);
    };
    // let Contacts = [];
    // for(var i=0;i<contacts.length;i++) {
    //     const acct = await Users.findById(contacts[i].userId);
    //     Contacts.push({...acct._doc, userName: contacts[i].userName});
    // }
    res.status(200).json({
        status: 'success',
        message: 'Data fetched successfully',
        participants: participantsData,
        images: Images,
        // contacts: Contacts,
    })
})