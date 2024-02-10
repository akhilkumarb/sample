const express = require('express');
const session = require('express-session');
const app = express();
const flash = require('connect-flash');
const { Sequelize, DataTypes } = require('sequelize');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const port = 4000;
app.use(express.static(__dirname + '/public'));
const path = require('path'); // Add this line to import the 'path' module
app.set('views', path.join(__dirname, 'views'));
const { Op } = require('sequelize'); // Import Sequelize operators for queries
const cookieParser = require('cookie-parser');

const csrf = require('csurf');


app.use(cookieParser()); // Parse cookies before csurf middleware

// Database configuration
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'anusha',
  database: 'anusha',
  port: 5432,
});

// Session store configuration
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sessionStore = new SequelizeStore({
  db: sequelize,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000,
});

app.use(session({
  secret: 'A1B2C3D4E5F6G7',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,

}));
sessionStore.sync().then(() => {
  console.log('Database and session table synchronized');
}).catch(error => {
  console.error('Error synchronizing session table:', error);
});app.use(flash());

const csrfProtection = csrf({ cookie: { httpOnly: true } }); // Specify httpOnly for added security
app.use(csrfProtection);

// Make the CSRF token available to views
app.use(function (req, res, next) {
  var token = req.csrfToken();
  res.cookie('XSRF-TOKEN', token);
  res.locals.csrfToken = token;
  next();
});

app.use(passport.initialize());
app.use(passport.session());
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/mainpage.html');
});

// Define Sequelize models
const Admin = sequelize.define('Admin', {
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
});

const People = sequelize.define('People', {
  username: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
});

const Sport = sequelize.define('Sport', {
  name: { type: DataTypes.STRING, allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: false },
});
// models.js or similar

const Schedule = sequelize.define('Schedule', {
  sportName: { type: DataTypes.STRING, allowNull: false },
  teamname: { type: DataTypes.STRING, allowNull: false },
  venue: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false },
  teamLogo: { type: DataTypes.STRING, allowNull: true }, // Add this line
  maxParticipants: { type: DataTypes.INTEGER, allowNull: true }, // Add this line
  eventName: { type: DataTypes.STRING, allowNull: true }, // Add this line
});

// Rest of the code
const PlayerJoins = sequelize.define('PlayerJoins', {
  playerName: { type: DataTypes.STRING, allowNull: false },
});

// Add the association between Schedule and PlayerJoins
Schedule.hasMany(PlayerJoins);
PlayerJoins.belongsTo(Schedule);

Sport.belongsTo(Admin);
Admin.hasMany(Sport);


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/admin'); // Redirect to the login page
};


app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/admin', (req, res) => {
  res.render('admin_signup');
});

app.get('/events', (req, res) => {
  res.render('events');
});

sequelize.sync({ force : false})
  .then(() => {
    console.log('Database and tables synchronized');
  })
  .catch((error) => {
    console.error('Error synchronizing database:', error);
  });
passport.use('admin', new LocalStrategy(async (username, password, done) => {
  try {
    const admin = await Admin.findOne({ where: { username, password } });
    if (admin) {
      return done(null, admin);
    } else {
      return done(null, false, { message: 'Invalid login credentials' });
    }
  } catch (error) {
    return done(error);
  }
}));

passport.use('person', new LocalStrategy(async (username, password, done) => {
  try {
    const person = await People.findOne({ where: { username, password } });
    if (person) {
      return done(null, person);
    } else {
      return done(null, false, { message: 'Invalid login credentials' });
    }
  } catch (error) {
    return done(error);
  }
}));

app.get('/admin', (req, res) => {
  console.log('CSRF Token during form rendering:', res.locals.csrfToken);

  res.render('admin_signup', { csrfToken: req.csrfToken() });
});

app.get('/player', (req, res) => {
  res.render('player_signup', { csrfToken: req.csrfToken() });
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}


app.post('/player/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Create a new person associated with the username
    const newPerson = await People.create({ username, email, password });

    // Serialize the user after creation
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Redirect to the main page for the created person
    res.redirect(/person_main/${newPerson.id});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


passport.serializeUser((user, done) => {
  done(null, user.id);
});



passport.deserializeUser(async (id, done) => {
  try {
    const admin = await Admin.findByPk(id);
    if (admin) {
      done(null, admin);
    } else {
      const person = await People.findByPk(id);
      done(null, person);
    }
  } catch (error) {
    done(error);
  }
});

// Middleware to ensure authentication for player routes

app.post('/person/login', (req, res, next) => {
  passport.authenticate('person', (err, user, info) => {
     console.log("hello");
    if (err) {
      return res.status(403).send('CSRF Token Mismatch');
        }
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/person');
    }
    console.log("anu");
    const storedCSRFToken = req.session.csrfToken;

    const receivedCSRFToken = req.body._csrf; // Adjust this based on how you receive the CSRF token
    console.log(storedCSRFToken);
    console.log(receivedCSRFToken);
    if (receivedCSRFToken == storedCSRFToken) {
      // CSRF token matches, render player_main
      return res.redirect('/person_main');
    } else {
      // CSRF token does not match, handle the situation (e.g., redirect or show an error)
      return res.status(403).send('CSRF Token Mismatch');
    }
  })(req, res, next);
});


app.get('/person_main', (req, res) => {
  res.render('player_main');
});
app.post('/admin/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const newAdmin = await Admin.create({ username, email, password });
    res.redirect(/admin_main/${newAdmin.id});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});




app.post('/admin/login', (req, res, next) => {
  passport.authenticate('admin', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash('error', info.message);
      return res.redirect('/admin');
    }
    
    req.login({ id: user.id, userType: 'admin' }, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/admin_main');
    });
  })(req, res, next);
});

// Player login route

app.get('/person_main/:personId', ensureAuthenticated, (req, res) => {
  const personId = req.params.personId;

  // Assuming you have stored the CSRF token in the session during login
  const storedCSRFToken = req.session.csrfToken;

  // Assuming you are getting the CSRF token from the request parameters
  const receivedCSRFToken = req.query.csrfToken; // Adjust this based on how you receive the CSRF token

  // Check if the received CSRF token matches the stored CSRF token
  if (receivedCSRFToken === storedCSRFToken) {
    // CSRF token matches, render player_main
    res.render('player_main');
  } else {
    // CSRF token does not match, handle the situation (e.g., redirect or show an error)
    res.status(403).send('CSRF Token Mismatch');
    // Alternatively, you can redirect to an error page
    // res.redirect('/error'); 
  }
});


// Admin route after login

app.get('/add_sport', (req, res) => {
  res.render('add_sport');

});
// Player route after login


app.get('/admin_main', (req, res) => {
   res.render('admin_main');
});
app.post('/admin/sports/add', ensureAuthenticated, async (req, res) => {
  try {
    const { name, image_url} = req.body;
    if (!image_url) {
      return res.status(400).send('Image URL cannot be null or empty.');
    }
    // Extract the admin ID from the authenticated session
    const adminId = req.user.id; // Assuming req.user is available, as it's set by Passport
    
    // Create a new sport associated with the admin
    const newSport = await Sport.create({ name, image_url,AdminId: adminId });

    res.redirect('/admin_main');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/schedules', (req, res) => {
  res.render('schedules');
});

app.get('/create_match', (req, res) => {
  try {
    res.render('schedules',);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/api/sports', async (req, res) => {
  try {
    const allSports = await Sport.findAll();
    res.json(allSports);
  } catch (error) {
    console.error('Error fetching sports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/create_schedule', ensureAuthenticated, async (req, res) => {
  try {
    const {
      sportName,
      teamname,
      venue,
      date,
      teamLogo,
      maxParticipants,
      eventName
    } = req.body;

    // Parse the incoming date string
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      // Check if the parsed date is valid
      throw new Error('Invalid date format');
    }
    // Format the date with day, date, and local time
     const formattedDate = parsedDate.toISOString();

    // Create a new schedule associated with the sport
    await Schedule.create({
      sportName,
      teamname,
      venue,
      date: formattedDate,
      teamLogo,
      maxParticipants,
      eventName
    });

    console.log('Schedule saved successfully');
    res.redirect('/player_main');
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
});
app.delete('/admin/sports/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sportId = req.params.id;
    await Sport.destroy({ where: { id: sportId } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
// Add this route to handle events for a specific sport
app.get('/events/:sportName', async (req, res) => {
  try {
    const sportName = req.params.sportName;

    // Fetch all events for the specified sport
    const events = await Schedule.findAll({ where: { sportName } });

    // Render a view or send JSON response with the events
    res.render('events', { sportName, events });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
app.get('/api/events', ensureAuthenticated, async (req, res) => {
  try {
    // Assuming your Schedule model has fields like teamname, opponent, date, venue, sportName
    const events = await Schedule.findAll({
      where: {
        date: {
          [Op.gte]: new Date(), // Filter events that are after the current date
        },
      },
      order: [['date', 'ASC']], // Order events by date in ascending order
    });

    // Return the events data as JSON
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Assuming you are using Express for your server
app.post('/join_event', async (req, res) => {
  try {
    const { eventId } = req.body;
    console.log(eventId);

    // Retrieve the username from the session (assuming you are using express-session)
    const username = req.user ? req.user.username : null;

    if (!username) {
      return res.status(403).json({ success: false, error: 'User not authenticated' });
    }

    // Check if the player has already joined the event
    const existingJoin = await PlayerJoins.findOne({
      where: {
        playerName: username,
      },
    });

    if (existingJoin) {
      return res.status(400).json({ success: false, error: 'Player already registered for this event' });
    }

    // Now, insert into PlayerJoins table
    const playerJoin = await PlayerJoins.create({
      ScheduleId: eventId,
      playerName: username,
    });

    res.json({ success: true, playerJoin });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
// Add this route to handle password change
// Add this route in your Express app

app.get('/admin/:adminId', (req, res) => {
  const adminId = req.params.adminId;
   res.render('player_main');
});

app.get('/player_main', ensureAuthenticated, (req, res) => {
  res.render('player_main');
});
app.get('/logout', (req, res) => {
  res.render('/');
});
app.listen(port, () => {
  console.log(Server is running on http://localhost:${port});
});