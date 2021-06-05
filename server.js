const express = require('express')
const methodOverride = require('method-override')
const mongoClient = require('./database/mongo-client')

mongoClient.connect()
  .catch(err => {
    console.error(err)
    process.exit()
  })

const app = express()

app.set('view engine', 'pug')
app.set('views', './views')

// app.use(express.json()) // req.body = {} <-- application/json
app.use(express.urlencoded({ extended: false })) // req.body = {} <-- application/x-www-form-urlencoded
app.use(express.static('./static'))
app.use(methodOverride('_method', { methods: ['GET', 'POST'] }))

app.use('/users', require('./routes/users'))

app.listen(3000, () => console.log('App listening on 3000'))
