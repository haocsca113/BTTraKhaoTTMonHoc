const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Registration = require('../models/Registration');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const auth = require('../middlewares/auth');

// --------------------- Route Admin ---------------------
router.get('/admin/login', (req, res) => {
  res.render('admin/admin-login', { title: 'Đăng nhập Admin' });
});

router.get('/admin/dashboard', auth, (req, res) => {
  res.render('admin/admin-dashboard', { 
    title: 'Admin Dashboard',
    admin: req.session.admin
  });
});

router.get('/admin/manage-courses', auth, async (req, res) => {
  const courses = await Course.find({});
  res.render('admin/admin-manage-courses', { 
    title: 'Admin Manage Courses', 
    courses,
  });
});

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  const admin = await User.findOne({ username });
  
  if (!admin) {
    return res.status(400).send('Sai tên đăng nhập hoặc mật khẩu');
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(400).send('Sai tên đăng nhập hoặc mật khẩu');
  }

  if (admin.role !== 'admin') {
    return res.status(403).send('Không có quyền truy cập');
  }

  // Lưu thông tin admin vào session
  req.session.admin = admin;

  res.redirect('/admin/dashboard');
});

router.get('/admin/logout', (req, res) => {
  delete req.session.admin;
  res.redirect('/admin/login');
});

router.get('/create', auth, function(req, res) {
  res.render('create.ejs', { title: 'Thêm môn học mới' });
});

// Them mon hoc
// router.post('/create-course', async (req, res) => {
//   const { name, description, maxStudents, registrationStart, registrationEnd } = req.body;
//   if (name && description && maxStudents && registrationStart && registrationEnd) {
//     const newCourse = new Course({ name, description, maxStudents, registrationStart, registrationEnd });
//     await newCourse.save();
//     res.redirect('/admin/manage-courses');
//   } else {
//     res.status(400).send('Vui lòng nhập đầy đủ thông tin môn học.');
//   }
// });

router.post('/create-course', async (req, res) => {
  const {
    name,
    description,
    maxStudents,
    registrationStart,
    registrationEnd,
    schedule
  } = req.body;

  if (name && description && maxStudents && registrationStart && registrationEnd) {
    // Chuyển đổi schedule nếu có (vì từ form sẽ là object)
    const parsedSchedule = Array.isArray(schedule)
      ? schedule
      : Object.values(schedule).map(s => ({
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime
        }));

    const newCourse = new Course({
      name,
      description,
      maxStudents,
      registrationStart: new Date(registrationStart),
      registrationEnd: new Date(registrationEnd),
      schedule: parsedSchedule
    });

    await newCourse.save();
    res.redirect('/admin/manage-courses');
  } else {
    res.status(400).send('Vui lòng nhập đầy đủ thông tin môn học.');
  }
});

// Sua mon hoc
router.get('/edit/:id', auth, async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (course) {
    res.render('edit', { title: 'Chỉnh sửa môn học', course });
  } else {
    res.status(404).send('Không tìm thấy môn học.');
  }
});

// Cap nhat mon hoc
// router.post('/update-course/:id', auth, async (req, res) => {
//   const { name, description, maxStudents, registrationStart, registrationEnd } = req.body;
//   await Course.findByIdAndUpdate(req.params.id, { name, description, maxStudents, registrationStart, registrationEnd });
//   res.redirect('/admin/manage-courses');
// });

router.post('/update-course/:id', auth, async (req, res) => {
  const {
    name,
    description,
    maxStudents,
    registrationStart,
    registrationEnd,
    schedule
  } = req.body;

  const parsedSchedule = Array.isArray(schedule)
    ? schedule
    : Object.values(schedule || {}).map(s => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime
      }));

  await Course.findByIdAndUpdate(req.params.id, {
    name,
    description,
    maxStudents,
    registrationStart: new Date(registrationStart),
    registrationEnd: new Date(registrationEnd),
    schedule: parsedSchedule
  });

  res.redirect('/admin/manage-courses');
});

// Xoa mon hoc
router.post('/delete/:id', auth, async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.redirect('/admin/manage-courses');
});

// Quan ly dang ky mon hoc
router.get('/admin/manage-registrations', async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate('userId')
      .populate('courseId');

    res.render('admin/manage-registrations', {
      title: 'Quản lý đăng ký môn học',
      admin: req.session.admin,
      registrations
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi lấy danh sách đăng ký');
  }
});

// Admin huy dang ky
router.post('/admin/registration/:id/cancel', async (req, res) => {
  try {
    await Registration.findByIdAndDelete(req.params.id);
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.status(500).send('Không thể huỷ đăng ký');
  }
});

// Xem danh sach sinh vien da dang ky mon hoc
router.get('/admin/courses/:id/registrations', async (req, res) => {
  try {
    const courseId = req.params.id;

    // Tìm môn học
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).send('Không tìm thấy môn học');

    // Lấy danh sách đăng ký và populate user
    const registrations = await Registration.find({ courseId })
      .populate('userId') // userId là ref đến User
      .sort({ createdAt: -1 });

    res.render('admin/course-registrations', {
      title: `Danh sách đăng ký - ${course.name}`,
      course,
      registrations
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi server');
  }
});

// Thong ke tong quan
router.get('/admin/stats', async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalRegistrations = await Registration.countDocuments();

    // Top 5 môn học được đăng ký nhiều nhất
    const topCourses = await Registration.aggregate([
      {
        $group: {
          _id: '$courseId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' }
    ]);

    // Môn học có nhiều lượt đăng ký nhất
    const mostRegistered = topCourses.length > 0 ? topCourses[0] : null;

    // Lấy ID các môn đã được đăng ký
    const registeredCourseIds = await Registration.distinct('courseId');

    // Môn học chưa ai đăng ký
    const unregisteredCourses = await Course.find({
      _id: { $nin: registeredCourseIds }
    });

    res.render('admin/stats', {
      title: 'Thống kê tổng quan',
      totalCourses,
      totalUsers,
      totalRegistrations,
      topCourses,
      mostRegistered,
      unregisteredCourses
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi thống kê');
  }
});


// --------------------- Route chung cho user va admin ---------------------
// Trang chi tiet mon hoc
router.get('/course/:id', async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (course) {
    res.render('detail', { title: 'Chi tiết môn học', course });
  } else {
    res.status(404).send('Môn học không tồn tại.');
  }
});

// Tim kiem mon hoc
router.get('/search', async (req, res) => {
  const query = req.query.q || '';
  
  // Tim kiem theo ten mon hoc khong phan biet chu hoa thuong
  const filteredCourses = await Course.find({
    name: { $regex: query, $options: 'i' }
  });

  res.render('search.ejs', {
    title: 'Kết quả tìm kiếm',
    courses: filteredCourses,
    query
  });
});


// --------------------- Route User ---------------------
// Trang index lay tat ca mon hoc
router.get('/', async (req, res) => {
  const filter = req.query.filter || 'all';
  const page = parseInt(req.query.page) || 1;
  const perPage = 5;
  
  const courses = await Course.find();
  let registeredCourseIds = [];
  let registrationsByCourse = {};
  let filteredCourses = courses;
  
  if (req.session.user) {
    const regs = await Registration.find({ userId: req.session.user._id }).select('courseId');
    registeredCourseIds = regs.map(r => r.courseId.toString());
  }

  // Dem so luong dang ky cho tung mon hoc
  const allRegistrations = await Registration.aggregate([
    {
      $group: {
        _id: '$courseId',
        count: { $sum: 1 }
      }
    }
  ]);

  allRegistrations.forEach(r => {
    registrationsByCourse[r._id.toString()] = r.count;
  });

  // Loc mon hoc con cho va full
  if (filter === 'available') {
    filteredCourses = courses.filter(course => {
      const count = registrationsByCourse[course._id.toString()] || 0;
      return count < course.maxStudents;
    });
  } else if (filter === 'full') {
    filteredCourses = courses.filter(course => {
      const count = registrationsByCourse[course._id.toString()] || 0;
      return count >= course.maxStudents;
    });
  }

  // Phân trang
  const totalCourses = filteredCourses.length;
  const totalPages = Math.ceil(totalCourses / perPage);
  const paginatedCourses = filteredCourses.slice((page - 1) * perPage, page * perPage);


  res.render('index', {
    title: 'Trang chủ',
    // courses: filteredCourses,
    courses: paginatedCourses,
    user: req.session.user,
    registeredCourseIds,
    registrationsByCourse,
    filter,
    currentPage: page,
    totalPages
  });
});

const isScheduleConflict = (schedule1, schedule2) => {
  for (let s1 of schedule1) {
    for (let s2 of schedule2) {
      if (s1.day === s2.day) {
        const [s1Start, s1End] = [s1.startTime, s1.endTime];
        const [s2Start, s2End] = [s2.startTime, s2.endTime];

        if (s1Start < s2End && s2Start < s1End) {
          return true; // trùng lịch
        }
      }
    }
  }
  return false;
};
// Dang ky mon hoc
router.post('/courses/register/:id', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const courseId = req.params.id;
  const userId = req.session.user._id;

  try {
    const course = await Course.findById(courseId);
    const count = await Registration.countDocuments({ courseId });
    const now = new Date();

    // Lấy các môn user đã đăng ký
    const existingRegs = await Registration.find({ userId }).populate('courseId');

    // Kiểm tra trùng lịch
    for (const reg of existingRegs) {
      const otherCourse = reg.courseId;
      if (isScheduleConflict(course.schedule, otherCourse.schedule)) {
        req.flash('error', `Lịch học trùng với môn "${otherCourse.name}".`);
        return res.redirect('back');
      }
    }

    // Kiem tra thoi gian mo/dong dang ky
    if (now < course.registrationStart) {
      req.flash('error', 'Chưa đến thời gian mở đăng ký môn học.');
      return res.redirect('back');
    }

    if (now > course.registrationEnd) {
      req.flash('error', 'Thời gian đăng ký môn học đã kết thúc.');
      return res.redirect('back');
    }

    // Kiểm tra giới hạn
    if (count >= course.maxStudents) {
      return res.send('Môn học này đã đủ số lượng đăng ký.');
    }

    // Kiểm tra đã đăng ký chưa
    const already = await Registration.findOne({
      courseId,
      userId
    });
    if (already) {
      return res.send('Bạn đã đăng ký môn học này rồi.');
    }

    // Tiến hành đăng ký
    await Registration.create({
      courseId,
      userId
    });

    req.flash('success', 'Đăng ký môn học thành công!');
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi khi đăng ký môn học');
  }
});

// Huy dang ky mon hoc
router.post('/courses/unregister/:id', async (req, res) => {
  const userId = req.session.user._id;
  const courseId = req.params.id;

  try {
    await Registration.deleteOne({ userId, courseId });
    req.flash('success', 'Hủy đăng ký môn học thành công!');
    res.redirect('back');
  } catch (err) {
    console.error('Lỗi khi hủy đăng ký:', err);
    res.status(500).send('Lỗi server khi hủy đăng ký');
  }
});

// Mon hoc cua toi
router.get('/my-courses', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const registrations = await Registration.find({ userId: req.session.user._id }).populate('courseId');
    res.render('pages/my-courses', {
      title: 'Môn học của tôi',
      user: req.session.user,
      registrations
    });
  } catch (err) {
    console.error('Lỗi khi lấy danh sách môn học:', err);
    res.status(500).send('Lỗi server');
  }
});

// Trang dang ky, dang nhap
// GET Register
router.get('/register', (req, res) => {
  res.render('register', { title: 'Đăng ký' });
});

// POST Register user
router.post('/register-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('Username đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 10 là độ mạnh (salt rounds)

    const newUser = new User({
      username,
      password: hashedPassword,
      role: 'user'
    });

    await newUser.save();

    // Đăng nhập ngay sau khi đăng ký
    req.session.user = newUser;

    res.redirect('/');
  } catch (err) {
    console.error('Lỗi khi đăng ký:', err);
    res.status(500).send('Lỗi đăng ký người dùng');
  }
});

// GET Login
router.get('/login', (req, res) => {
  res.render('login', { title: 'Đăng nhập' });
});

// POST Login user
router.post('/login-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || user.role !== 'user') {
      return res.status(400).send('Sai tên đăng nhập hoặc mật khẩu');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send('Sai tên đăng nhập hoặc mật khẩu');
    }

    // Đăng nhập thành công
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    console.error('Lỗi khi đăng nhập:', err);
    res.status(500).send('Lỗi server khi đăng nhập');
  }
});

// Đăng xuất user
router.get('/logout', (req, res) => {
  delete req.session.user;
  res.redirect('/');
});

module.exports = router;