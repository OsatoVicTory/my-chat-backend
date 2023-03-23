const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require("../models/Users");
const Calls = require("../models/Calls");
const { fastFindInDBData } = require("../utils/Optimisers");

exports.getAllUserCalls = catchAsync(async (req, res) => {
    let calls = await Calls.find();
    const allUsers = await Users.find();
    calls.reverse();
    const { refId } = req.user;
    const User = fastFindInDBData(refId, allUsers);

    let allCalls = [];
    let unSeen = 0;

    for(var i=0;i<calls.length;i++) {
        const { callerRefId, toRefId, createdAt } = calls[i];
        if(refId !== callerRefId && refId !== toRefId) continue;
        if(User.clearedCallLogs >= new Date(createdAt).getTime()) continue;
        if(User.callsLastChecked < new Date(createdAt).getTime()) unSeen++;

        let isCaller = callerRefId == refId;
        let accountInCallWith;
        if(isCaller) accountInCallWith = fastFindInDBData(toRefId, allUsers);
        else accountInCallWith = fastFindInDBData(callerRefId, allUsers);

        allCalls.push({
            account: accountInCallWith,
            call: calls[i]
        });
    };

    res.status(200).json({
        calls: allCalls, unSeen,
        status: 'success',
    })

});

exports.getSpecificCall = catchAsync(async (req, res) => {
    const call = await Calls.findById(req.params.id);

    res.status(200).json({
        status: 'success',
        call: call._doc
    })
})

exports.createCall = catchAsync(async (req, res) => {

    const { refId, id } = req.user;
    let data = {};
    if(req.body.caller == id) {
        const user = await Users.find(req.body.receiver);
        data.toRefId = user._doc.refId;
        data.callerRefId = refId;
    } else {
        const user = await Users.find(req.body.caller);
        data.toRefId = refId;
        data.callerRefId = user._doc.refId;
    }
    const newCall = new Calls({...req.body,...data});
    await newCall.save();

    res.status(200).json({
        status: 'success',
        callLinkId: newCall?._doc._id||newCall._id,
        call: newCall?._doc||newCall,
        message: 'Call link created succesfully'
    })
})
