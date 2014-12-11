angular.module( 'instructor.dashboard', [
  'ui.router'
])

.config(function config( $stateProvider ) {
  $stateProvider.state('root.instructorDashboard', {
    abstract: true,
    url: 'dashboard',
    data: {
      authorizedRoles: ['instructor','manager','admin'],
      pageTitle: 'Dashboard'
    },
    resolve: {
      courses: function (CoursesService) {
        return CoursesService.getEnrollmentsWithStudents();
      },
      activeCourses: function (courses, $q, $filter) {
        var deferred = $q.defer();
        var active = $filter('filter')(courses, {archived: false});
        deferred.resolve(active);
        return deferred.promise;
      },
      coursesInfo: function (activeCourses, ReportsService) {
        return ReportsService.getCourseInfo(activeCourses);
      },
      myGames: function (coursesInfo,activeCourses) {
        if (activeCourses[0]) {
          return coursesInfo[activeCourses[0].id].games;
        }
        return {};
      }
    },
    views: {
      'main@': {
        templateUrl: 'instructor/dashboard/instructor-dashboard.html',
        controller: function ($scope, $timeout, $log, myGames) {
          //$scope.myGames = myGames;
          //$scope.showNotification = false;
          //
          //$scope.alert = {
          //  type: 'gl-notify',
          //  msg: "<strong>SimCityEDU Game Update:</strong> Be sure your students update to the latest version of the game! <a href=\"/games/SC?scrollTo=content\">Download here</a>"
          //};
          //
          //$timeout(function() { $scope.showNotification = true; }, 1000);
          //
          //$scope.hideNotification = function() {
          //  $scope.showNotification = false;
          //};
        }
      }
    }
  })

  .state('root.instructorDashboard.default', {
    url: '',
    controller: function($scope, $state, $log, myGames, activeCourses) {
      // Decide which state to send the instructor to, based on whether
      // they have courses set up.
      if (!myGames.length) {
        $state.go('root.instructorDashboard.intro');
      } else {
        $state.go('root.instructorDashboard.gameplay',
          { gameId: myGames[0].gameId, courseId: activeCourses[0].id });
      }
    }
  })

  .state('root.instructorDashboard.intro', {
    url: '/intro',
    templateUrl: 'instructor/dashboard/_dashboard-intro.html'
  })

  .state('root.instructorDashboard.gameplay', {
    url: '/game/:gameId/course/:courseId',
    resolve: {
      myGames: function ($stateParams, coursesInfo) {
        // all available games for this course
        return coursesInfo[$stateParams.courseId].games;
      },
      defaultGameId: function ($stateParams, myGames) {
        var defaultGameId = myGames[0].gameId;
        // check if current game is in course, if not, set default as first available game.
        angular.forEach(myGames, function (game) {
          if (game.gameId === $stateParams.gameId) {
            defaultGameId = game.gameId;
          }
        });
        return defaultGameId;
      }
    },
    templateUrl: 'instructor/dashboard/_new-dashboard-reports.html',
    controller: 'InstructorDashboardCtrl'
  });
})



.controller('InstructorDashboardCtrl', function($scope, $rootScope, $state, $stateParams, $log, $timeout, activeCourses, coursesInfo, myGames, defaultGameId, GamesService, ReportsService) {

  $scope.students = {};
  $scope.courses = {};
  $scope.myGames = myGames;
  $scope.shoutOuts = [];
  $scope.watchOuts = [];
  $scope.averageMissionProgress = null;

  $scope.status = {
    selectedGameId: defaultGameId,
    selectedGame: null,
    nextGameId: null,
    prevGameId: null
  };

  // Courses - Setup course options and select course ///////////
  $scope.courses.isOpen = false;
  $scope.courses.selectedCourseId = $stateParams.courseId;
  $scope.courses.options = {};

  angular.forEach(activeCourses, function (course) {
    $scope.courses.options[course.id] = course;
  });

  $scope.courses.selected = $scope.courses.options[$stateParams.courseId];


  var _setSelectedGameById = function(gameId) {
    var selectedIndex = _.findIndex($scope.myGames, {'gameId': gameId});
    $scope.status.selectedGame = $scope.myGames[selectedIndex];

    var prevIndex = _getPrevIndex($scope.myGames, selectedIndex);
    $scope.status.prevGameId = $scope.myGames[prevIndex].gameId;

    var nextIndex = _getNextIndex($scope.myGames, selectedIndex);
    $scope.status.nextGameId = $scope.myGames[nextIndex].gameId;
  };

  /* Given an array and current index, find the previous index */
  var _getPrevIndex = function(ary, idx) {
    var prevIndex = idx - 1;
    if (prevIndex < 0) { prevIndex = ary.length - 1; }
    return prevIndex;
  };

  /* Given an array and current index, find the next index */
  var _getNextIndex = function(ary, idx) {
    var nextIndex = idx + 1;
    if (nextIndex > ary.length - 1) { nextIndex = 0; }
    return nextIndex;
  };


  /* Create an object whose keys are student.id and value is student */
  // All students from all courses
  var _populateStudentsListFromCourses = function(courseList) {
    _.each(courseList, function(course) {
      _.each(course.users, function(student) {
        if (!_.has($scope.students, student.id)) {
          $scope.students[student.id] = student;
        }
      });
    });
  };

  var _getReports = function() {
    GamesService.getAllReports($stateParams.gameId).then(function(data) {
      if (data.list && data.list.length) {
        var hasSOWO = _.some(data.list, {'id': 'sowo'});
        var hasMissionProgress = _.some(data.list, {'id': 'mission-progress'});

        if (hasSOWO) {
          ReportsService.get('sowo', $stateParams.gameId, $stateParams.courseId)
            .then(function(data) {
                _populateSOWO(data); },
              function(data) { $log.error(data); });
        }
        if (hasMissionProgress) {
          ReportsService.get('mission-progress',$stateParams.gameId, $stateParams.courseId)
              .then(function (data) {
                _calculateMissionProgress(data);
              },
              function (data) {
                $log.error(data);
              });
        }
      }
    });
  };

  var _initDashboard = function() {
    // populates student list
    _populateStudentsListFromCourses(activeCourses);
    // set current game
    _setSelectedGameById($stateParams.gameId);

    $scope.$watch('courses.selectedCourseId', function(newValue, oldValue) {
      if (newValue) {
        $state.go('root.instructorDashboard.gameplay', {
          gameId: $scope.status.selectedGameId,
          courseId: newValue
        });
      }
      });
      $scope.$watch('status.selectedGameId', function (newValue, oldValue) {
        if (newValue) {
          $state.go('root.instructorDashboard.gameplay', {
            gameId: newValue,
            courseId: $scope.courses.selectedCourseId
          });
        }
      });
    // retrieve all reports for game
    _getReports();
  };

  var _calculateMissionProgress = function(students) {
    var numOfStudents = students.length;
    var totalAverage = 0;
    _.each(students,function(student) {
      var totalCompleted = 0;
      _.each(student.missions, function(mission) {
        if (mission.completed) {
          totalCompleted++;
        }
      });
      var average = totalCompleted/student.missions.length;
      totalAverage += average;
    });
    $scope.averageMissionProgress = totalAverage / numOfStudents;
  };

  var _populateSOWO = function(data) {
    var watchOuts = [];
    var shoutOuts = [];

    _.each(data, function(obj) {
       var studentObj = _compileNameOfStudent($scope.students[obj.userId]);
      _.each(obj.results.watchout, function(wo) {
        wo.user = studentObj;
        wo.timestamp = moment(new Date(1415838021807)).fromNow();
        watchOuts.push(wo);
      });
      _.each(obj.results.shoutout, function (so) {
        so.user = studentObj;
        so.timestamp = moment(new Date(1415838021807)).fromNow();
        shoutOuts.push(so);
      });
    });

    $scope.watchOuts = watchOuts;
    $scope.shoutOuts = shoutOuts;
  };



  var _compileNameOfStudent = function(student) {
    if (!student) { return ''; }
    var name = student.firstName;
    if(student.lastName) {
      name += ' ' + student.lastName + '.';
    }

    student.name = name;
    return student;
  };

  _initDashboard();
});

