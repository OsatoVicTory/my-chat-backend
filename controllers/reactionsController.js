const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require("../models/Users");
// const Reactions = require("../models/Reactions");
const { fastFindInDBData } = require("../utils/Optimisers");
const GroupMessages = require("../models/GroupMessages");


exports.getReactions = catchAsync(async (req, res) => {
    const allUsers = await Users.find();
    const User = fastFindInDBData(req.user.refId, allUsers);
    // const allReactions = await Reactions.find({ messageId: req.param.messageId });
    const msg = {gc: GroupMessages, dm: DirectMessages}
    const { messageId, type } = req.params;
    const message = await msg[type].findById(messageId);
    let { reactions } = message._doc;
    for(var i=0;i<reactions.length;i++) {
        const acct = fastFindInDBData(reactions[i].userRefId, allUsers);
        reactions[i].img = acct.img;
        reactions[i].name = User.contacts.find(c => c.userId == acct._id)?.userName || acct.phoneNumber;
    }

    res.status(200).json({
        status: 'success',
        message: 'Successfully retreived reactions data',
        reactions
    })
});

exports.removeReaction = catchAsync(async (req, res) => {
    if(req.params.type == "group") {
        const message = await GroupMessages.findById(req.params.messageId);
        let { reactions } = message._doc;
        reactions.filter(react => react.userId == req.user.id);
        await GroupMessages.findByIdAndUpdate(
            req.params.messageId,
            {reactions}
        );
    } else {
        const message = await DirectMessages.findById(req.params.messageId);
        let { reactions } = message._doc;
        reactions.filter(react => react.useId == req.user.id);
        await DirectMessages.findByIdAndUpdate(
            req.params.messageId,
            {reactions}
        );
    }
    // await Reactions.findByIdAndDelete(req.param.id);
});

exports.sendReaction = catchAsync(async(req, res) => {
    const msg = {gc: GroupMessages, dm: DirectMessages}
    const { messageId, type } = req.params;
    const message = await msg[type].findById(messageId);
    let { reactions } = message._doc;
    for(var i=0;i<reactions.length;i++) {
        if(reactions[i].userId == req.user.id) {
            reactions[i].emoji = req.body.emoji;
            break;
        }
    }
    if(i == reactions.length) reactions.push({ 
        emoji: req.body.emoji, userId: req.user.id, userRefId: req.user.refId
    });
    await msg[type].findByIdAndUpdate(
        messageId,
        {reactions}
    );
    // const newReaction = new Reactions({
    //     emoji: req.body.emoji,
    //     userRefId: req.user.refId,
    //     userId: req.user.id,
    // });
    // await newReaction.save();
    res.status(200).json({
        status:'success',
        message:'Successfully reacted',
        reactions
    })
})