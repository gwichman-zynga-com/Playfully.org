angular.module( 'instructor.reports', [
  'playfully.config',
  'ui.router',
  'reports'
])

.config(function ( $stateProvider, USER_ROLES) {
  $stateProvider.state( 'reports', {
    url: '/reports',
    views: {
      main: {
        templateUrl: 'instructor/reports/reports.html',
        controller: 'ReportsCtrl'
      }
    },
    resolve: {
      allGames: function(GamesService) {
        return GamesService.all();
      },
      activeCourses: function(CoursesService) {
        return CoursesService.getActiveEnrollmentsWithStudents();
      }
    },
    data: {
      authorizedRoles: ['instructor'],
      pageTitle: 'Reports'
    }
  });
})


.controller( 'ReportsCtrl',
  function($scope, $state, $stateParams, $log, allGames, activeCourses, CoursesService, ReportsService) {

    $scope.students = {};
    $scope.achievements = [];

    $scope.courses = {
      selected: null,
      options: {}
    };
    angular.forEach(activeCourses, function(course) {
      $scope.courses.options[course.id] = course;
      angular.forEach(course.users, function(student) {
        student.isSelected = true;
        if (!$scope.students.hasOwnProperty(student.id)) {
          $scope.students[student.id] = student;
        }
      });
    });

    $scope.courses.selected = activeCourses[0].id;

    $scope.games = {
      isOpen: false,
      selected: 'AA-1',
      options: {}
    };
    angular.forEach(allGames, function(game) {
      if (game.enabled) {
        $scope.games.options[''+game.gameId] = game;
      }
    });


    $scope.reports = {
      isOpen: false,
      selected: 'SOWO',
      options: {
        'SOWO': {
          id: 'SOWO',
          title: 'Shout Out and Watch Out',
          positon: 1
        },
        'ACHV': {
          id: 'ACHV',
          title: 'Game Achievements & Time Played',
          position: 2
        }
      }
    };

    $scope.selectGame = function($event, key) {
      $scope.games.selected = key;
      $scope.toggleDropdown($event, 'games');
    };

    $scope.selectReport = function($event, key) {
      $scope.reports.selected = key;
      $scope.toggleDropdown($event, 'reports');
    };

    $scope.toggleDropdown = function($event, collection) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope[collection].isOpen = !$scope[collection].isOpen;
    };



    $scope.$watchCollection('[games.selected, reports.selected]', function(newValue, oldValue) {
      var requestedGame = newValue[0];
      var requestedReport = newValue[1];

      if (requestedReport == 'ACHV') {
        ReportsService.getAchievements(requestedGame, $scope.courses.selected)
          .then(function(data) {
            angular.forEach(data, function(d) {
              $scope.students[d.userId].achievements = d.achievements;
            });
            if (!$scope.achievements.length) {
              angular.forEach(data[0].achievements, function(achievement) {
                var achv = angular.copy(achievement);
                delete achv.won;
                $scope.achievements.push(achv);
              });
            }
          });
          
      } else if (requestedReport = 'SOWO') {
        ReportsService.getSOWO(requestedGame, $scope.courses.selected)        
          .then(function(data) {
            $log.info('shoutouts');
            $log.info(data);
          });
      }

    });


    // $scope.courses = [];

    // CoursesService.getEnrollmentsWithStudents()
    //   .then(function(data) {
    //     $log.info(data);
    //     angular.forEach(data, function(course) {
    //       if (!course.archived) {
    //         $scope.courses.push(course);
    //       }
    //     });
    //     angular.forEach($scope.courses[0].users, function(student) {
    //       $scope.students.push(student);
    //     });
    //     $scope.courses[0].isExpanded = true;
    //     ReportsService.getAchievements('AA-1', $scope.courses[0].id)
    //       .then(function(students) {
    //         angular.forEach(students, function(student) {
    //           angular.forEach($scope.students, function(s) {
    //             if (s.id == student.userId) {
    //               s.achievements = student.achievements;
    //             }
    //           });
    //         });
    //         angular.forEach($scope.students[0].achievements, function (achievement) {
    //           var obj = angular.copy(achievement);
    //           delete obj.won;
    //           $scope.achievements.push(obj);
    //         });
    //         $scope.activeAchievements.push($scope.achievements[0]);
    //         $scope.activeAchievements.push($scope.achievements[1]);
    //         $scope.activeAchievements.push($scope.achievements[2]);
    //         $log.info($scope.activeAchievements);
    //       });
    //   });


  $scope.getStudentResult = function(studentId, achievement) {
    angular.forEach($scope.students, function(student) {
      if (student.id == studentId) {
        angular.forEach(student.achievements, function(achv) {
          if (achv.group == achievement.group && achv.item == achievement.item) {
            $log.info('Got a match at least');
            return achv.won;
          }
        });
      }
    });
  };




});

