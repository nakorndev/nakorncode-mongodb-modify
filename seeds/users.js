const _ = require('lodash')
const faker = require('faker')
const { MongoClient } = require('mongodb')

const client = new MongoClient('mongodb://127.0.0.1:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const seed = async () => {
  await client.connect()
  const db = client.db('my-first-project')
  const usersCollection = db.collection('users')
  
  const users = []
  
  for (const i of _.range(100)) {
    const user = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      age: _.random(18, 40),
      salary: Number(_.random(10, 80)) * 1000,
      terminationDate: Math.random() > 0.9 ? new Date(faker.date.past()) : null, // 10%
      skills: _.sampleSize(['html', 'css', 'js', 'node', 'db', 'network', 'server'], _.random(1, 5))
    }
    users.push(user)
  }
  
  await usersCollection.insertMany(users)
  process.exit()
}

seed()
