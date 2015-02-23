/**
 * Created by charles on 2/5/15.
 */
angular.module('license', [])
    .service('LicenseService', function ($http, $log, $rootScope, API_BASE) {

            this.getCurrentPlan = function () {
                var apiUrl = API_BASE + '/license/plan';
                return $http({method: 'GET', url: apiUrl})
                    .then(function (response) {
                        return response.data;
                    }, function (response) {
                        console.log(response);
                        return response;
                    });
            };
            this.getStudentList = function () {
                var apiUrl = API_BASE + '/license/students';
                return $http({method: 'GET', url: apiUrl})
                    .then(function (response) {
                        return response.data;
                    }, function (response) {
                        console.log(response);
                        return response;
                    });
            };
            this.getPackages = function () {
                var apiUrl = API_BASE + '/license/packages';
                return $http({method: 'GET', url: apiUrl})
                    .then(function (response) {
                        return response.data;
                    }, function (response) {
                        console.log(response);
                        return response;
                    });
            };
            this.subscribeToLicense = function (input) {
                var apiUrl = API_BASE + '/license/subscribe';
                return $http.post(apiUrl, {planInfo: input.planInfo, stripeInfo: input.stripeInfo });
            };
            this.inviteTeachers = function (emails) {
                var apiUrl = API_BASE + '/license/invite';
                return $http.post(apiUrl, {teacherEmails: emails})
                    .then(function (response) {
                        return response.data;
                    });
            };
            this.activateLicenseStatus = function () {
                var apiUrl = API_BASE + '/license/activate';
                return $http.post(apiUrl);
            };
            this.isOwner = function () {
                if ($rootScope.currentUser) {
                    return $rootScope.currentUser.id === $rootScope.currentUser.licenseOwnerId;
                }
            };
            this.isTrial = function () {
                if ($rootScope.currentUser) {
                    return $rootScope.currentUser.isTrial;
                }
            };
            this.hasLicense = function () {
              if ($rootScope.currentUser) {
                  if ($rootScope.currentUser.isTrial) {
                      return 'trial';
                  }
                  if ($rootScope.currentUser.licenseStatus==="active") {
                      return 'premium';
                  }
              }
            };
            this.licenseExpirationDate = function() {
                if( $rootScope.currentUser &&
                    this.hasLicense() ) {
                    return $rootScope.currentUser.expirationDate;
                }
            };
            this.leaveCurrentPlan = function () {
                return $http.post(API_BASE + '/license/leave');
            };
            this.removeEducator = function (email) {
                return $http.post(API_BASE + '/license/remove', {teacherEmail: email});
            };
            this.startTrial = function () {
                return $http.post(API_BASE + '/license/trial');
            };
            this.disableAutoRenew = function () {
                return $http.post(API_BASE + '/license/cancel');
            };
            this.enableAutoRenew = function () {
                return $http.post(API_BASE + '/license/renew');
            };
            this.upgradeLicense = function (input) {
                var apiUrl = API_BASE + '/license/upgrade';
                return $http.post(apiUrl, {planInfo: input.planInfo, stripeInfo: input.stripeInfo});
            };
            this.getBillingInfo = function () {
                var apiUrl = API_BASE + '/license/billing';
              return $http({method: 'GET', url: apiUrl})
                  .then(function (response) {
                      return response.data;
                  }, function (response) {
                      return response;
                  });
            };
            this.updateBillingInfo = function (stripeInfo) {
                var apiUrl = API_BASE + '/license/billing';
                return $http.post( apiUrl, {card: stripeInfo});
            };
    });