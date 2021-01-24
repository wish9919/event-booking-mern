const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const bcrypt = require("bcryptjs");

const Event = require("./models/event");
const User = require("./models/user");

const mongoose = require("mongoose");

const app = express();

app.use(bodyParser.json());

const events = [];

app.use(
  "/graphql",
  graphqlHTTP({
    schema: buildSchema(`
    type Event{
        _id: ID!
        title: String!
        description: String!
        price: Float!
        date: String!
    }

    type User {
      _id: ID!
      email: String!
      password: String
    }

    input UserInput {
      email: String!
      password: String!
    }

    input EventInput {
        title: String!
        description: String!
        price: Float!
        date: String!
    }
        type RootQuery {
            events: [Event!]!
        }
        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      events: () => {
        return Event.find()
          .then((events) => {
            return events.map((event) => {
              return { ...event._doc, _id: event.id };
            });
          })
          .catch((err) => {
            console.lop(err);
          });
      },
      createEvent: (args) => {
        const event = Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
        });

        console.log(event);
        events.push(event);
        event
          .save()
          .then((result) => {
            // console.log(result);
            return { ...result._doc, _id: result._doc._id.toString() };
          })
          .catch((err) => {
            console.log(err);
          });
        return event;
      },

      createUser: (args) => {
        return User.findOne({
          id: args.userInput._id,
        })
          .then((user) => {
            if (user) {
              throw new Error("User exists already");
            }
            return bcrypt.hash(args.userInput.password, 12);
          })

          .then((hashedPassword) => {
            const user = new User({
              email: args.userInput.email,
              password: hashedPassword,
            });
            return user.save();
          })
          .then((result) => {
            return { ...result._doc, password: null, id: result.id };
          })
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.3mwx5.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
