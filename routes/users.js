const _ = require('lodash')
const { ObjectID } = require('mongodb')
const path = require('path')
const fs = require('fs').promises
const multer = require('multer')
const sharp = require('sharp')
const mongoClient = require('../database/mongo-client')

const uploadAvatar = multer({ dest: path.resolve(__dirname, '../temp') })

const users = mongoClient.db('my-first-project').collection('users')

const router = require('express-async-router').AsyncRouter()

// INDEX
router.get('/', async (req, res) => {
  const page = Number(req.query.page) || 1
  const perPage = Number(req.query.per_page) || 30
  const offset = (page - 1) * perPage
  const cond = {}
  if (req.query.first_name) {
    cond.firstName = req.query.first_name
  }
  if (req.query.terminated == 'yes') {
    // $ne = not equal
    cond.terminationDate = { $ne: null } 
  }
  if (req.query.terminated == 'no') {
    cond.terminationDate = null
  }
  if (req.query.age_lt) {
    // $lt = less than <
    // $lte = less than or equal <=
    cond.age = { $lte: Number(req.query.age_lt) }
  }
  if (req.query.age_gt) {
    // $gt = greater than >
    // $gte = greater than or equal >=
    const qy = { $gte: Number(req.query.age_gt) }
    if (typeof cond.age == 'object') {
      Object.assign(cond.age, qy)
    } else {
      cond.age = qy
    }
  }
  if (req.query.age) {
    cond.age = Number(req.query.age)
  }
  if (req.query.skills?.length) {
    const value = Array.isArray(req.query.skills)
      ? req.query.skills
      : [ req.query.skills ]
    cond.skills = { $all: value }
  }
  const cursor = await users
    .find(cond)
    .skip(offset)
    .limit(perPage)
  const list = await cursor.toArray()
  if (!Array.isArray(req.query.skills)) {
    req.query.skills = []
  }
  return res.render('users-index.pug', {
    users: list,
    query: req.query,
    skills: Array.isArray(req.query.skills)
      ? req.query.skills
      : [ req.query.skills ]
  })
})

// CREATE
router.get('/create', (req, res) => {
  return res.render('users-create.pug')
})

// ADD
router.post('/', uploadAvatar.single('avatar'), async (req, res) => {
  const toSet = _.pick(req.body, ['firstName', 'lastName', 'age', 'salary', 'skills'])
  toSet.age = Number(toSet.age)
  toSet.salary = Number(toSet.salary)
  toSet.skills = Array.isArray(toSet.skills) ? toSet.skills : [ toSet.skills ]
  const user = await users.insertOne(toSet)
  if (req.file) {
    const avatarSubPath = `/avatars/${user.insertedId}.jpg`
    const avatarPath = path.resolve(__dirname, `../static/${avatarSubPath}`)
    const buffer = await fs.readFile(req.file.path)
    await sharp(buffer)
      .resize(150, 150)
      .jpeg({ quality: 90 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toFile(avatarPath)
    await fs.rm(req.file.path)
    await users.updateOne({ _id: new ObjectID(user.insertedId) }, { $set: { avatarUrl: avatarSubPath } })
  }
  return res.redirect(`/users/${user.insertedId}`)
})

// SHOW
router.get('/:id', async (req, res) => {
  const id = req.params.id
  const user = await users.findOne({ _id: new ObjectID(id) })
  if (!user) {
    res.status(404)
    return res.send({ message: 'user not found' })
  }
  return res.render('users-show.pug', { user })
})

// EDIT
router.get('/:id/edit', async (req, res) => {
  const id = req.params.id
  const user = await users.findOne({ _id: new ObjectID(id) })
  if (!user) {
    res.status(404)
    return res.send({ message: 'user not found' })
  }
  return res.render('users-edit.pug', { user })
})

// UPDATE
router.put('/:id', uploadAvatar.single('avatar'), async (req, res) => {
  const toSet = _.pick(req.body, ['firstName', 'lastName', 'age', 'salary', 'skills'])
  toSet.age = Number(toSet.age)
  toSet.salary = Number(toSet.salary)
  toSet.skills = Array.isArray(skills) ? toSet.skills : [ toSet.skills ]
  if (req.file) {
    const avatarSubPath = `/avatars/${req.params.id}.jpg`
    const avatarPath = path.resolve(__dirname, `../static/${avatarSubPath}`)
    const buffer = await fs.readFile(req.file.path)
    await sharp(buffer)
      .resize(150, 150)
      .jpeg({ quality: 90 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toFile(avatarPath)
    await fs.rm(req.file.path)
    toSet.avatarUrl = avatarSubPath
  }
  await users.updateOne(
    { _id: new ObjectID(req.params.id) },
    { $set: toSet }
  )
  return res.redirect(`/users/${req.params.id}`)
})

// DELETE
router.delete('/:id', async (req, res) => {
  // await users.deleteOne({ _id: new ObjectID(req.params.id) })
  await users.updateOne(
    { _id: new ObjectID(req.params.id) },
    { $set: { terminationDate: new Date() } }
  )
  return res.redirect('/users')
})

module.exports = router
