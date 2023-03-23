const sharp = require('sharp');
const { encode } = require('blurhash');
const axios = require('axios');
const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require("../models/Users");
const DirectMessages = require("../models/DirectMessages");
const { fastFindInDBData } = require("../utils/Optimisers");
const cloudinary = require("../routes/cloudinary");
const { 
    sortAndMergeIds, sameDay, getTime, 
    formatImagesTime, convertToBase64URL, convertToBuffer 
} = require("../utils/helpers");


exports.getAllUserDirectMessages = catchAsync(async (req, res) => {
    
    const { refId } = req.user;

    let messages = await DirectMessages.find();
    const allUsers = await Users.find();
    messages.reverse();

    let accountsInChatWith = new Map();
    let time = null;

    for(var i=0;i<messages.length;i++) {

        let { senderRefId, receiverRefId, isRead, deletedFor, _id, createdAt } = messages[i];

        if(refId != senderRefId && refId != receiverRefId) continue;

        let accountInChatWith;
        const isSender = senderUserId == refId;
        if(isSender) accountInChatWith = fastFindInDBData(receiverRefId, allUsers);
        else accountInChatWith = fastFindInDBData(senderRefId, allUsers);
        
        await DirectMessages.findByIdAndUpdate(
            _id,
            {isDelivered: true}
        )
        
        let { messagesData, unreadMessages } = accountsInChatWith.get(accountInChatWith._id) || {}  
        
        messages[i].time = !sameDay(time, createdAt) ? getTime(createdAt) : null
        time = createdAt;
        messages[i].senderImg = fastFindInDBData(senderRefId, allUsers).img;

        if(messagesData) {
            accountsInChatWith.set(accountInChatWith._id, {
                account: accountInChatWith,
                unreadMessages: (!isSender && !isRead && deletedFor != refId) ? (unreadMessages + 1) : unreadMessages,
                messagesData: deletedFor == refId ? [...messagesData] : [...messagesData, messages[i]]
            });
        } else {
            accountsInChatWith.set(accountInChatWith._id, {
                account: accountInChatWith,
                unreadMessages: (!isSender && !isRead && deletedFor != refId) ? 1 : 0,
                messagesData: deletedFor == refId ? [] : [messages[i]]
            });
        }
    }

    let chatsToSend = [];
    for(var chats of accountsInChatWith) chatsToSend.push(chats[1]);

    res.status(200).json({
        messages: chatsToSend,
        status: 'success'
    })
});

//user refreshed page on a paticular chat with someone
//so we dont have data about this chat yet
//so fetch the messages linked with this chat and 
//data on the account in-chat-with(accountRefId) => (image,name,about,last-seen)
exports.getSpecificDirectMessages = catchAsync(async (req, res) => {

    const { refId } = req.user;
    const accountUser = await Users.findById(req.params.id);
    const { accountRefId } = accountUser._doc;
    let messages = await DirectMessages.find();
    messages.reverse();
    let unReads = 0;
    const sortedAccountsId = sortAndMergeIds(refId, accountRefId);
    let time = null;

    let messagesToSend = [];
    for(var i=0;i<messages.length;i++) {
        let { accountsInvolvedId, isRead, receiverRefId, deletedFor } = messages[i];

        if(accountsInvolvedId !== sortedAccountsId) continue;
        if(deletedFor == refId) continue;
        if(!isRead && receiverRefId == refId) unReads++;       
        messages[i].time = !sameDay(time, createdAt) ? getTime(createdAt) : null;
        time = createdAt;

        messagesToSend.push(messages[i]);
    }

    await DirectMessages.updateMany(
        { accountsInvolvedId: sortedAccountsId, receiverRefId: refId },
        { isRead: true }
    );

    res.status(200).json({
        account: accountUser._doc,
        messages: messagesToSend,
        unReads,
        status: 'success'
    })
});

exports.getUserDetails = catchAsync(async (req, res) => {
    const user = await Users.findById(req.params.id);
    res.status(200).json({
        stsus: 'success',
        message: 'Data fetched succeefully',
        account: user._doc
    })
});

//mean we have data from chats page and user clicks on
//a particular chat, so he automatically, has read all messages
//there so delete
exports.readDirectMessages = catchAsync(async (req, res) => {
    const { refId } = req.user;
    const user = await Users.findById(req.params.id);
    const { accountRefId } = user._doc;
    const sortedAccountsId = sortAndMergeIds(refId, accountRefId);
    await DirectMessages.updateMany(
        { accountsInvolvedId: sortedAccountsId, receiverRefId: refId },
        { isRead: true }
    );
});

exports.sendDirectMessage = catchAsync(async (req, res) => {
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
    const newMessage = new DirectMessages({
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

exports.deleteSpecificDirectMessagesForMe = catchAsync(async (req, res) => {
    const { messagesToDelete } = req.body;
    for(var i=0;i<messagesToDelete.length;i++) {
        let { _id, deletedFor } = messagesToDelete[i];
        if(deletedFor) {
            await DirectMessages.findByIdAndDelete(_id);
        } else {
            await DirectMessages.findbyIdAndUpdate(
                _id,
                {deletedFor: req.user.refId}
            );
        }
    }

    res.status(200).json({
        status: 'success',
        message: `Message${messagesToDelete.length > 1 ? "s": ""} deleted successfully`
    })
})
exports.deleteAllDirectMessagesForMe = catchAsync(async (req, res) => {
    const { refId } = req.user;
    const user = await Users.findById(req.params.id);
    const { accountRefId } = user._doc;
    const sortedAccountsId = sortAndMergeIds(refId, accountRefId);
    await DirectMessages.updateMany(
        {accountsInvolvedId: sortedAccountsId},
        {deletedFor: refId}
    )
})

exports.deleteOneDirectMessageForAll = catchAsync(async (req, res) => {
    const message = await DirectMessages.findById(req.params.messageId);
    const { images } = message._doc;
    if(images.length == 1 && images[0]?.public_id) await cloudinary.uploader.destroy(images[0].public_id);
    await DirectMessages.findByIdAndDelete(req.params.messageId);
});

exports.fetchUserAccount = catchAsync(async (req, res) => {
    const user = await Users.findById(req.params.id);
    res.status(200).json({
        account: user._doc,
        status: 'success',
        message: 'User data fetched successfully'
    })
});

exports.fetchChatsImages = catchAsync(async (req, res) => {
    
    const user = await Users.findById(req.params.id);
    const allUsers = await Users.find();
    const { accountRefId } = user._doc;
    const { refId } = req.user;
    let messages = await DirectMessages.find();
    messages.reverse();
    const sortedAccountsId = sortAndMergeIds(refId, accountRefId);

    let Images = [];
    for(var i=0;i<messages.length;i++) {
        let { accountsInvolvedId, senderRefId, senderId, images, createdAt, deletedFor } = messages[i];

        if(accountsInvolvedId !== sortedAccountsId) continue;
        if(deletedFor == refId) continue;
        if(images.length > 0) {
            for(var j=0;j<images.length;j++) {
                const acct = fastFindInDBData(senderRefId, allUsers);
                Images.push({
                    img: images[j],
                    senderImg: acct?.img,
                    senderName: user._doc.contacts.find(u => u.userId == senderId)?.userName||act.userName,
                    senderNumber: acct.phoneNumber,
                    time: formatImagesTime(createdAt),
                });
            }
        }
    }
    res.status(200).json({
        status: 'success',
        message: 'Images fetched successfully',
        images: Images,
    })
})