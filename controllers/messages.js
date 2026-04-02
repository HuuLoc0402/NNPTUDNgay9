let mongoose = require('mongoose');
let messageModel = require('../schemas/messages');

module.exports = {
  // Get all messages between current user and specific user
  getConversation: async function (currentUserId, otherUserId) {
    try {
      if (!mongoose.isValidObjectId(otherUserId)) {
        throw new Error('userID is invalid');
      }

      return await messageModel
        .find({
          isDeleted: false,
          $or: [
            {
              from: currentUserId,
              to: otherUserId
            },
            {
              from: otherUserId,
              to: currentUserId
            }
          ]
        })
        .populate('from', 'username email avatarUrl')
        .populate('to', 'username email avatarUrl')
        .sort({ createdAt: 1 });
    } catch (error) {
      throw error;
    }
  },

  // Create a new message
  createMessage: async function (from, to, messageContent) {
    try {
      let newMessage = new messageModel({
        from: from,
        to: to,
        messageContent: messageContent
      });
      await newMessage.save();
      await newMessage.populate([
        {
          path: 'from',
          select: 'username email avatarUrl'
        },
        {
          path: 'to',
          select: 'username email avatarUrl'
        }
      ]);

      return newMessage;
    } catch (error) {
      throw error;
    }
  },

  // Get last message from each conversation for current user
  getLastMessages: async function (currentUserId) {
    try {
      if (!mongoose.isValidObjectId(currentUserId)) {
        throw new Error('current user id is invalid');
      }

      const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

      // Get all unique users that current user has conversation with
      return await messageModel.aggregate([
        {
          $match: {
            $or: [
              { from: currentUserObjectId },
              { to: currentUserObjectId }
            ],
            isDeleted: false
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$from', currentUserObjectId] },
                '$to',
                '$from'
              ]
            },
            lastMessage: { $first: '$$ROOT' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: '$user.username',
            avatarUrl: '$user.avatarUrl',
            email: '$user.email',
            lastMessage: 1
          }
        },
        {
          $sort: { 'lastMessage.createdAt': -1 }
        }
      ]);
    } catch (error) {
      throw error;
    }
  }
};
