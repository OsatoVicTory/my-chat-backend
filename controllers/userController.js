const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const Users = require("../models/Users");
const DirectMessages = require("../models/DirectMessages");
const GroupMessages = require("../models/GroupMessages");
const bcrypt = require("bcrypt");
const { getRandomColor } = require("../utils/helpers");
// const { sendAccountVerificationMail } = require("./mailsController");
const { sendCookie } = require("./sendCookie");
const cloudinary = require("../routes/cloudinary");
const { convertToBase64URL } = require("../utils/helpers");
require("dotenv").config();

exports.fix = catchAsync(async (req, res) => {
    await Users.findByIdAndUpdate(req.user.id, { userGroups: [] });
    return res.status(200).json({status: "done"})
})
exports.logInUser = catchAsync(async (req, res) => {
    
    const { email, password } = req.body;
    const user = await Users.findOne({ email });


    if(!user) return appError(res, 500, "Invalid Email address");

    const validPassword = await bcrypt.compare(password, user.password);

    if(!validPassword) return appError(res, 500, "Invalid Password");

    const tokenData = { id: user._doc._id.toString(), refId: user._doc.refId };

    const token = await jwt.sign(tokenData, process.env.MYSECRET);

    if(!user.isVerified) {

        return res.status(200).json({
            status: 'failed',
            message: "User Not Verified. Redirecting to Verification Page",
            token
        })
    }
    const { contacts } = user._doc;
    let contactsData = [];
    for(var i=0;i<contacts.length;i++) {
        const data = await Users.findById(contacts[i].userId);
        const {img,phoneNumber,about} = data._doc;
        contactsData.push({
            userName: contacts[i].userName,
            img, phoneNumber, about
        });
    }

    sendCookie(res, token);
    return res.status(200).json({
        status: 'success',
        message: "Logged In Successfully",
        user: {...user._doc, contactsData}
    })
});

exports.signUpUser = catchAsync(async (req, res, next) => {

    const { email, password } = req.body;

    const allUsers = await Users.find();
    const userExist = allUsers.find(user => user.email == email);
    
    if(userExist) return appError(res, 400, "User Already Exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
        ...req.body,
        password: hashedPassword,
        isVerified: false,
        refId: `#MY_CHAT_${allUsers.length+1}`,
        userColor: getRandomColor(),
    }
    const newUser = new Users(userData);

    const tokenData = { id: newUser._id.toString() };
    const token = jwt.sign(tokenData, process.env.MYSECRET);

    await newUser.save();

    res.status(200).json({
        status: 'success',
        message: 'User Created. Redirecting to Verification Page',
        token
    });

});

exports.verifyAccount = catchAsync(async (req, res) => {

    const decodedToken = await jwt.verify(req.params.token, process.env.MYSECRET);

    await Users.findByIdAndUpdate(decodedToken.id, {
        isVerified: true
    });

    res.status(200).json({
        status: 'success',
        message: 'Account Verified Successfully. Redirecting to Log in'
    })

});

exports.userLoggedIn = catchAsync(async (req, res) => {
    const user = await Users.findById(req.user.id);
    const { contacts } = user._doc;
    let contactsData = [];
    for(var i=0;i<contacts.length;i++) {
        const data = await Users.findById(contacts[i].userId);
        contactsData.push(data._doc);
    }

    const userData = {
        ...user._doc, contactsData,
        id: user._doc._id.toString(),
    }

    res.status(200).json({
        status: 'success',
        message: `Welcome Back ${userData.userName}`,
        user: userData
    })
});

exports.logOutUser = catchAsync(async (req, res) => {

    res.clearCookie("MY_CHAT");
    return res.status(200).json({
        status: 'success',
        message: 'Logged Out Successfully'
    });
});

exports.updateContacts = catchAsync(async (req, res) => {
    await Users.findByIdAndUpdate(req.user.id,
        {contacts: [...req.body]}
    )
});

exports.updateWhoViewsMyStatus = catchAsync(async (req, res) => {
    await Users.findByIdAndUpdate(req.user.id,
        {whoSeesMyStatus: [...req.body]}
    );
});

//last time we checked status or calls home page in frontend;
exports.lastCheck = catchAsync(async (req, res) => {
    await Users.findByIdAndUpdate(req.user.id,
        { [req.params.type] : Date.now() }
    )
});

exports.updateAccount = catchAsync(async(req, res) => {
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
    const User = await Users.findByIdAndUpdate(req.user.id, {...data}, { new: true });
    res.status(200).json({
        status: 'success',
        user: User
    })
});

exports.clearCallLogs = catchAsync(async (req, res) => {
    await Users.findByIdAndUpdate(req.user.id,
        { clearedCallLogs: Date.now() }
    )
});

exports.getContactsImages = catchAsync(async (req, res) => {
    const User = await Users.findById(req.user.id);
    const { contacts } = User._doc;
    let data = [];
    for(var i=0;i<contacts.length;i++) {
        const user = await Users.findById(contacts[i].userId);
        data.push({
            img: user._doc.img,
            _id: user.doc._id,
            userId: user._doc._id,
            userName: contacts[i].userName
        })
    };
    res.status(200).json({
        status: 'success',
        message: 'Fetched data successfully',
        contacts: data
    })
});

exports.shareLink = catchAsync(async (req, res) => {
    const { id, refId } = req.user;
    const user = await Users.findById(id);
    const { receivers, message } = req.body;
    let messages = [];
    for(var i=0;i<receivers.length;i++) {
        let newMessage;
        const messageData = {
            messageTagged: null, ...message,
            senderName: user._doc.userName, senderNumber: user._doc.phoneNumber,
            senderRef: refId, receiver: receivers[i].refId,
            senderId: id, senderColor: user._doc.userColor,
            accountsInvolvedId: sortAndMergeIds(refId, receivers[i].refId)
        };

        if(receivers[i].type == "group") {
            newMessage = GroupMessages(messageData);
            await newMessage.save();
        } else {
            newMessage = DirectMessages(messageData);
            await newMessage.save()
        }

        messages.push(newMessage);
    }

    res.status(200).json({
        status: 'success',
        message: 'Sent successfully',
        messages, accounts: receivers,
    });
});

exports.forwardMessage = catchAsync(async (req, res) => {
    const { id, refId } = req.user;
    const user = await Users.findById(id);
    const { receivers, message } = req.body;
    let messages = [];
    for(var i=0;i<receivers.length;i++) {
        let newMessage;
        const messageData = {
            messageTagged: null, ...message,
            senderName: user._doc.userName, senderNumber: user._doc.phoneNumber,
            senderRef: refId, receiver: receivers[i].refId,
            senderId: id, senderColor: user._doc.userColor,
            accountsInvolvedId: sortAndMergeIds(refId, receivers[i].refId)
        };

        if(receivers[i].type == "group") {
            newMessage = GroupMessages(messageData);
            await newMessage.save();
        } else {
            newMessage = DirectMessages(messageData);
            await newMessage.save()
        }

        messages.push(newMessage);
    }

    res.status(200).json({
        status: 'success',
        message: 'Sent successfully',
        messages, accounts: receivers,
    });
});

exports.searchUsers = catchAsync(async (req, res) => {
    const allUsers = await Users.find();
    const { search } = req.params;
    const { id } = req.user;
    let users = {targetUsers: [], plainUsers: []};
    for(var i=0;i<allUsers.length;i++) {
        if(allUsers[i]._id === id) continue;
        if(allUsers[i]?.userName.includes(search) || allUsers[i]?.phoneNumber.includes(search)) {
            users.targetUsers.push(allUsers[i]);
            continue;
        }
        else if(allUsers[i]?.firstName.includes(search) || allUsers[i]?.lastName.includes(search)) {
            users.targetUsers.push(allUsers[i]);
        }
        else {
            users.plainUsers.push(allUsers[i]);
        }
    }
    users.plainUsers = [...users.plainUsers.slice(0, 20)];

    res.status(200).json({
        status: 'success',
        message: 'Search completed', 
        users
    })
});