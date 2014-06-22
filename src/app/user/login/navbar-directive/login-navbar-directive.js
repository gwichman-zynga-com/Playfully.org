/**
 * User login navbar
 *
 * @module user.login.navbar
 **/
angular.module('user.login.navbar', ['ui.bootstrap'])

/**
 * The login navbar directive is a reusable widget that can show login or
 * logout buttons and information about the current authenticated user.
 *
 * @class loginNavbar
 * @example <login-navbar></login-navbar>
 **/

.directive('loginNavbar', function( User, $modal ) {
  var directive = {
    templateUrl: 'user/login/navbar-directive/login-navbar-directive.html',
    restrict: 'E',
    replace: true,
    // scope: true,
    controller: function ($scope, $modal, $location) {

      $scope.showLoginModal = function() {
        $scope.$emit('modal.show', {
          templateUrl: 'user/login/form/login-form.html',
          controller: 'LoginFormModalCtrl',
          size: 'lg'
        });
      };

      $scope.redirectToLogin = function() {
        $location.path('/login');
      };

    },
    link: function($scope, $element, $attrs, $controller) {


      $scope.showLogin = function() {
        console.log($attrs);
        if( $attrs.type === 'modal' ) {
          console.log("Showing modal…");
          $scope.showLoginModal();
        } else {
          console.log("Redirecting…");
          $scope.redirectToLogin();
        }
      };

      /**
       * Property attaches the User method to the directive's scope
       *
       * @property isAuthenticated
       * @type Method
       **/
      $scope.isAuthenticated = User.isAuthenticated;

      /**
       * Property attaches the User method to the directive's scope
       *
       * @property showLogin
       * @type Method
       **/

      /**
       * Property attaches the User method to the directive's scope
       *
       * @property logout
       * @type Method
       **/
      $scope.logout = User.logout;


      $scope.$watch(function() {
        return User.currentUser;
      }, function(currentUser) {
        $scope.currentUser = currentUser;
      });
    }
  };
  return directive;
});
