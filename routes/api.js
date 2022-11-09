"use strict";

const Reply = require("../models/Reply");
const Thread = require("../models/Thread");
const { generateHashPassword, compareHashPassword } = require("../utils");

module.exports = function (app) {
  app
    .route("/api/threads/:board")
    .get(async function (req, res) {
      const board = req.params.board;
      const result = await Thread.aggregate([
        {
          $match: {
            board: board,
          },
        },
        {$unwind: "$replies"},
        {
          $group: {
            _id: "$_id",
            text: {$first: "$text"},
            replies: {$push: "$replies"},
            created_on: {$first: "$created_on"},
            bumped_on: {$first: "$bumped_on"},
            replycount: {$sum: 1}
          }
       },
        {
          $lookup: {
            from: "replies",
            localField: "replies",
            foreignField: "_id",
            as: "replies",
            pipeline: [
              {
                $sort: {
                  created_on: -1,
                },
              },
              {
                $limit: 3,
              },
              {
                $project: {
                  text: 1,
                  created_on: 1,
                }
              }
            ],
          },
        },
        {
          $sort: {
            bumped_on: -1,
          },
        },
        {
          $limit: 10,
        },
      ]);
      res.json(result);
    })
    .post(async function (req, res) {
      const board = req.params.board;
      const { text, delete_password } = req.body;
      const thread = new Thread({
        board,
        text,
      });
      thread.delete_password = await generateHashPassword(delete_password);
      await thread.save();
      res.redirect(`/b/${board}/`);
    })
    .put(async function (req, res) {
      const { thread_id } = req.body;
      const thread = await Thread.findById(thread_id);
      thread.reported = true;
      await thread.save();
      res.send("reported");
    })
    .delete(async function (req, res) {
      const { thread_id, delete_password } = req.body;
      const thread = await Thread.findOne({ _id: thread_id });
      if (!thread) return res.send("Not found");
      if (!(await compareHashPassword(delete_password, thread.delete_password)))
        return res.send("incorrect password");
      await thread.delete();
      res.send("success");
    });

  app
    .route("/api/replies/:board")
    .get(async function (req, res) {
      const threadId = req.query.thread_id;
      const result = await Thread.findById(threadId).populate(
        "replies",
        "text created_on"
      );

      if (!result) return res.send("Thread not found");
      res.json(result);
    })
    .post(async function (req, res) {
      const board = req.params.board;
      const { text, delete_password, thread_id } = req.body;
      const reply = new Reply({
        text,
        thread_id,
      });

      reply.delete_password = await generateHashPassword(delete_password);

      await reply.save();

      const thread = await Thread.findById(thread_id);
      thread.replies.push(reply);
      await thread.save();

      res.redirect(`/b/${board}/${thread_id}`);
    })
    .put(async function (req, res) {
      const { thread_id, reply_id } = req.body;
      const reply = await Reply.findOne({
        _id: reply_id,
        thread_id: thread_id,
      });

      if (!reply) return res.send("Not found");
      reply.reported = true;
      await reply.save();

      res.send("reported");
    })
    .delete(async function (req, res) {
      const { thread_id, reply_id, delete_password } = req.body;
      const reply = await Reply.findOne({
        _id: reply_id,
        thread_id: thread_id,
      });
      if (!reply) return res.send("Not found");

      if (!(await compareHashPassword(delete_password, reply.delete_password)))
        return res.send("incorrect password");
      reply.text = "[deleted]";
      await reply.save();

      res.send("success");
    });
};
