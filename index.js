const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
app = express();
app.use(express.json());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sequelize = require("./config/sequelize");
const User = require("./model/user");
const Task = require("./model/task");
const Comment = require("./model/comment");

// USER SECTION
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(403)
        .json({ message: "You must provide a valid input" });
    }

    const ifUserExists = await User.findOne({ where: { email } });

    if (ifUserExists) {
      return res.status(403).json({
        message: "A user with this email exists, please try another.",
      });
    }

    if (password.length < 6) {
      return res
        .status(403)
        .json({ message: "Password is too short, must exceed 6 characters." });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    // console.log(hashPassword);
    const newUser = {
      name: name,
      email: email,
      password: hashPassword,
    };

    await User.create(newUser);
    return res.status(200).json({ message: "User Successfully created." });
  } catch (error) {
    return res.status(500), json({ message: "" + message.error });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const ifUserExists = await User.findOne({ where: { email } });

    if (!ifUserExists) {
      return res.status(404).json({ message: "Account doesn't exist" });
    }

    const checkPassword = await bcrypt.compare(password, ifUserExists.password);

    if (!checkPassword) {
      return res.status(403).json({ message: "Incorrect credentials" });
    }

    const accessToken = jwt.sign(
      {
        id: ifUserExists.id,
        name: ifUserExists.name,
        email: ifUserExists.email,
      },
      process.env.JWT_SECRET
    );

    console.log(accessToken);

    return res.status(200).json({ message: "Login Successful", accessToken });
  } catch (error) {
    return res.status(500), json({ message: "" });
  }
});

app.delete("/user/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const ifExist = await User.findOne({ where: { id } });

    if (ifExist) {
      await User.destroy({ where: { id } });
      return res.status(200).json({ message: "User deleted successfully" });
    } else {
      return res
        .status(404)
        .json({ message: "User with this ID does not exist" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal servver error " + error.message });
  }
});

// TASK SECTION
app.post("/add-task", async (req, res) => {
  try {
    const { title, description, status, due_date, createdFor } = req.body;
    const isUserValid = await User.findByPk(createdFor);

    if (!isUserValid) {
      return res
        .status(404)
        .json({ message: `User with ID: ${createdFor} does not exist` });
    }

    const createTask = {
      title,
      description,
      status,
      due_date,
      createdFor,
    };

    await Task.create(createTask);
    return res.status(200).json({ message: "Task successfully created" });
  } catch (error) {
    return res.status(500).json({ message: "" + error.message });
  }
});

app.put("/task/:taskId", async (req, res) => {
  try {
    const { status, userId } = req.body;
    const { taskId } = req.params;

    const taskIdToNum = parseInt(taskId);
    if (isNaN(taskIdToNum)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const isUserValid = await User.findByPk(userId);
    const isTaskValid = await Task.findByPk(taskIdToNum);

    if (!status || !userId) {
      return res
        .status(400)
        .json({ message: "Status and userId are required" });
    }

    if (!isUserValid) {
      return res.status(404).json({ message: "User not found" });
    }

    if (isTaskValid) {
      if (
        isUserValid.role === "admin" ||
        isTaskValid.createdFor === isUserValid.id
      ) {
        try {
          await Task.update(
            {
              status: status,
            },
            {
              where: { id: taskIdToNum },
            }
          );
          return res.status(200).json({ message: "Task updated successfully" });
        } catch (error) {
          return res.status(500).json({ message: "" + message.error });
        }
      } else {
        return res.status(400).json({
          message: "You do not have permission to update this task status",
        });
      }
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    return res.status(500).json({ message: +message.error });
  }
});

app.delete("/delete-task/:taskId", async (req, res) => {
  try {
    const { userId } = req.body;
    const { taskId } = req.params;

    const taskIdToNum = parseInt(taskId);
    if (isNaN(taskIdToNum)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const ifUserExists = await User.findByPk(userId);
    const ifTaskExists = await Task.findByPk(taskIdToNum);

    if (!ifUserExists) {
      return res.status(400).json({ message: "User does not exist" });
    }

    if (ifTaskExists) {
      if (
        ifUserExists.role === "admin" ||
        ifTaskExists.createdFor === ifUserExists.id
      ) {
        await Task.destroy({ where: { id: taskIdToNum } });
        return res.status(200).json({ message: "Task deleted successfully" });
      } else {
        return res
          .status(400)
          .json({ message: "You do not have permission to delete this task" });
      }
    } else {
      return res.status(400).json({ message: "Task does not exist" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal servver error " + error.message });
  }
});

// ADDING COMMENTS TO TASK
app.post("/task-comment", async (req, res) => {
  try {
    const { comment, createdFor } = req.body;

    const ifTaskExists = await Task.findByPk(createdFor);
    if (ifTaskExists) {
      const newComment = {
        comment,
        createdFor,
      };
      await Comment.create(newComment);
      return res.status(200).json({ message: "Comment added successfully" });
    } else {
      return res.status(400).json({ message: "Task does not exist" });
    }
  } catch (error) {
    return res.status(500).json({ message: "" + error.message });
  }
});

app.put("/task-comment/:commentId", async (req, res) => {
  try {
    const { comment, createdBy } = req.body;
    const { commentId } = req.params;

    const commentIdToNum = parseInt(commentId);
    if (isNaN(commentIdToNum)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const ifUserExists = await User.findByPk(createdBy);
    const ifCommentExists = await Comment.findByPk(commentIdToNum);

    if (!ifUserExists) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!ifCommentExists) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const ifTaskExists = await Task.findByPk(ifCommentExists.createdFor);

    if (!ifTaskExists) {
      return res.status(404).json({ message: "Associated task not found" });
    }

    if (
      ifUserExists.role === "admin" || 
      ifTaskExists.createdFor === ifUserExists.id
    ) {
      await Comment.update(
        { comment },
        { where: { id: commentIdToNum } }
      );

      return res
        .status(200)
        .json({ message: "Comment updated successfully" });
    } else {
      return res.status(403).json({
        message: "You do not have permission to update this comment",
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
});

app.delete("/task-comment/:commentId", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    const commentIdToNum = parseInt(commentId);
    if (isNaN(commentIdToNum)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const ifUserExists = await User.findByPk(userId);
    const ifCommentExists = await Comment.findByPk(commentIdToNum);

    if (!ifUserExists) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!ifCommentExists) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const ifTaskExists = await Task.findByPk(ifCommentExists.createdFor);

    if (!ifTaskExists) {
      return res.status(404).json({ message: "Associated task not found" });
    }

    if (
      ifUserExists.role === "admin" || 
      ifTaskExists.createdFor === ifUserExists.id
    ) {
      await Comment.destroy({ where: { id: commentIdToNum } });
      return res.status(200).json({ message: "Comment deleted successfully" });
    } else {
      return res.status(403).json({
        message: "You do not have permission to delete this comment",
      });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error: " + error.message });
  }
});


app.listen(2000, async () => {
  try {
    await sequelize.sync();
    await sequelize.authenticate();
  } catch (error) {
    console.log(
      "There was an error conneecting to the database " + error.message
    );
  }
});
