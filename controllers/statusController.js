const sharp = require('sharp');
const { encode } = require('blurhash');
const axios = require('axios');
const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require("../models/Users");
const Status = require("../models/Status");
const { fastFindInDBData } = require("../utils/Optimisers");
const cloudinary = require("../routes/cloudinary");
const { convertToBase64URL, convertToBuffer } = require("../utils/helpers");


exports.getAllStatusUpdates = catchAsync(async (req, res) => {
    const { id, refId } = req.user;
    let status = await Status.find();
    const allUsers = await Users.find();
    status.reverse();

    let allStatusUpdate = new Map();
    const curUser = fastFindInDBData(refId, allUsers);

    for(var i=0;i<status.length;i++) {
        const { posterRefId, posterId, viewers, createdAt } = status[i];
        if(new Date().getTime() - new Date(createdAt).getTime() >= 86400000) {
            const { statusValue, _id } = status[i];
            if(statusValue?.img) await cloudinary.uploader.destroy(statusValue.public_id);
            await Status.findByIdAndDelete(_id);
            continue;
        }
        let contact = curUser.contacts.find(contac => contac.userId == posterId);
        if(!contact) continue;

        let posterAccount = fastFindInDBData(posterRefId, allUsers);
        posterAccount.userName = contact.userName;

        let { statuses, viewed } = allStatusUpdate.get(posterAccount._id) || {};
        if(statuses) {
            allStatusUpdate.set(posterAccount._id, {
                account: posterAccount,
                statuses: [...statuses, status[i]],
                viewed: viewers.find(viewer => viewer.userId == id) ? viewed + 1 : viewed,
                isUser: posterRefId == refId,
                viewers: posterRefId == refId ? viewers : null,
            })
        } else {
            allStatusUpdate.set(posterAccount._id, {
                account: posterAccount,
                statuses: [status[i]],
                viewed: viewers.find(viewer => viewer.userId == id) ? 1 : 0,
                isUser: posterRefId == refId,
                viewers: posterRefId == refId ? viewers : null,
            })
        }
    };
    let statusToSend = {
        user: [],
        recentUpdates: [],
        viewedUpdates: []
    };

    for(var statusUpdate of allStatusUpdate) {
        let { isUser, isSeen, statuses } = statusUpdate[1];
        if(isUser) statusToSend.user.push(statusUpdate[1]);
        else if(isSeen < statuses.length) statusToSend.recentUpdate.push(statusUpdate[1]);
        else statusToSend.viewedUpdate.push(statusUpdate[1]);
    }

    res.status(200).json({
        statuses: statusToSend,
        staus: 'success',
    })
});

exports.createStatusUpdate = catchAsync(async (req, res) => {
    let { statusValue } = req.body;
    let Data = {};
    let base64;
    if(statusValue) {
        if(typeof statusValue == 'object') base64 = await convertToBase64URL(img);
        if(typeof statusValue == 'string') base64 = statusValue;
        const { public_id, secure_url } = await cloudinary.uploader.upload(
            base64, { folder: "/MyChat/status", public_id: statusValue?.name||Date.now() }
        );
        Data = {img: secure_url, public_id};
    }
    const buffer = convertToBuffer(base64);
    const { data, info } = await sharp(buffer)
        .ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true });
    const encoded = encode(data, info.width, info.height, 4, 4);
    Data.hash = encoded;
    const status = new Status({ ...req.body, statusValue: Data })
    await status.save();
    res.status(200).json({
        status: 'success',
        message: 'Status sent successfully',
        postData: status?._doc||status
    })
});

exports.viewStatusUpdate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const status = await Status.findById(req.params.id);

    if(!status._doc.viewers.find(viewer => viewer.userId == req.user.id)) {
        // const User = await Users.findById(req.user.id);
        // const { userName } = User.contacts.find(contact => contact.userId == viewerId);
        // const data = {img: User.img, userName, userId: viewerId };
        await Status.findByIdAndUpdate(id,
            {$push: {"viewers": { userId: req.user.id, time: String(new Date()) }}}
        );
        res.status(200).json({
            status:'success', message:'Success',
            info: 'notFound'
        })
    } else {
        res.status(200).json({
            status:'success', message:'Success',
            info: 'Found'
        })
    }
});

exports.deleteStatusUpdate = catchAsync(async (req, res) => {
    const status = await Status.findById(req.params.id);
    await cloudinary.uploader.destroy(status._doc.statusValue.public_id);
    await Status.findByIdAndDelete(req.params.id);
    res.status(200).json({
        status: 'success',
        message: "Status deleted successfully"
    })
})