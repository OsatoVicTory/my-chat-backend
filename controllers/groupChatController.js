const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const Users = require("../models/Users");
const Groupchats = require("../models/Groupchats");
const GroupMessages = require("../models/GroupMessages");
const cloudinary = require("../routes/cloudinary");
const { convertToBase64URL } = require("../utils/helpers");

exports.createGroup = catchAsync(async (req, res) => {

    const allGroups = await Groupchats.find();
    let { img } = req.body;
    let cloudinary_id = null;
    if(typeof img === 'object') {
        const base64 = await convertToBase64URL(img);
        const { public_id, secure_url } = await cloudinary.uploader.upload(
            base64, { folder: "/MyChat/account", public_id: img.name }
        );
        img = secure_url;
        cloudinary_id = public_id;
    }
    const newGroup = new Groupchats({
        ...req.body, img, cloudinary_id,
        groupRefId: `MY_GROUP_${allGroups.length+1}`
    });
    await newGroup.save();

    res.status(200).json({
        group: newGroup._doc,
        status: 'success',
        message: 'New Group created successfully'
    });
});

exports.updateDescription = catchAsync(async (req, res) => {
    let { img, cloudinary_id } = req.body;
    if(typeof img === 'object') {
        if(cloudinary_id) await cloudinary.uploader.destroy(cloudinary_id);
        const base64 = await convertToBase64URL(img);
        const { public_id, secure_url } = await cloudinary.uploader.upload(
            base64, { folder: "/MyChat/account", public_id: img.name }
        );
        img = secure_url;
        cloudinary_id = public_id;
    }
    const data = {...req.body, img, cloudinary_id};
    const newGroup = await Groupchats.findByIdAndUpdate(req.params.id, {...data}, {new: true} );

    res.status(200).json({
        group: newGroup,
        status: 'success',
        message: 'New Group created successfully'
    });
});

exports.makeAdmin = catchAsync(async (req, res) => {
    const group = await Groupchats.findById(req.params.id);
    let { participants } = group._doc;
    for(var i=0;i<participants.length;i++) {
        if(participants[i].userId == req.params.userId) {
            participants[i].admin = true;
            break;
        }
    }
    const newGroup = await Groupchats.findByIdAndUpdate(req.params.id, {participants}, {new:true});

    res.status(200).json({
        status: 'success',
        message: 'New Admin added successfully',
        group: newGroup
    })
});


exports.addUserToGroup = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {user} = req.body;
    let newParticipants = [];
    const curUser = await Users.findById(req.user.id);
    let userData = [];
    for(var i=0;i<user.length;i++) {
        const User = await Users.findByIdAndUpdate(user[i], 
            {$push: {"userGroups": id }},
            { new: true }
        )
        userData.push(User._doc.phoneNumber);
        newParticipants.push({userId: user[i], admin: false})
    }
    const newGroup = await Groupchats.findByIdAndUpdate(id, 
        {participants: [...newParticipants]},
        { new: true }
    );
    const message = new GroupMessages({ 
        messageType: 'joining', groupId: id, groupRefId: newGroup._doc.groupRefId,
        message: `${curUser._doc.phoneNumber} added ${user.length > 1 ? userData.join(", ") : userData[0]}` 
    });
    await message.save();

    res.status(200).json({
        status: 'success',
        message: 'User added successfully',
        group: newGroup
    })
});

exports.joinGroupLink = catchAsync(async (req, res) => {
    
    const { refId } = req.user;
    const { id } = req.params;
    const group = await Groupchats.findById(id);
    const user = await Users.findById(req.user.id);
    let { participants } = group._doc;
    let { groups } = user._doc; 
    participants.push({ refId, userId: req.user.id, admin: null });
    groups.push(id);
    await Users.findByIdAndUpdate(req.user.id, { groups });
    const newGroup = await Groupchats.findByIdAndUpdate(id, { participants }, { new: true });
    const message = new GroupMessages({ 
        messageType: 'joining', groupId: id, groupRefId: newGroup._doc.groupRefId,
        message: `${user._doc.phoneNumber} joined via group link` 
    });
    await message.save();
    res.status(200).json({
        message,
        status: 'success'
    })
})

exports.exitGroup = catchAsync(async (req, res) => {
    
    const { id } = req.params;
    const group = await Groupchats.findById(id);
    const user = await Users.findById(req.user.id);
    let { participants } = group._doc;
    let { groups, _id, phoneNumber } = user._doc;
    participants = participants.filter(user => user.userId !== req.user.id);
    groups = groups.filter(g => g == id);

    await Users.findByIdAndUpdate(_id, { groups });
    
    await Groupchats.findByIdAndUpdate(id, 
        { participants }
    );
    const newGroup = await Groupchats.findByIdAndUpdate(id, { participants }, { new: true });
    const message = new GroupMessages({ 
        messageType: 'joining', groupId: id, groupRefId: newGroup._doc.groupRefId,
        message: `${phoneNumber} left` 
    });
    await message.save();

    res.status(200).json({
        groups,
        status: 'success',
        message: 'Successfully exited the Group'
    })
});