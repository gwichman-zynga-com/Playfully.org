angular.module('playfully.subscribe', ['subscribe.const','register.const'])

    .config(function ($stateProvider) {
        $stateProvider.state('root.subscribe', {
            abstract: true,
            url: 'subscribe'
        })
            .state('root.subscribe.payment', {
                url: '/payment?packageType?seatsSelected',
                resolve: {
                    packages: function (LicenseService) {
                        return LicenseService.getPackages();
                    }
                },
                views: {
                    'main@': {
                        templateUrl: 'subscribe/subscribe-payment.html',
                        controller: 'SubscribeUpgradeCtrl'
                    }
                },
                data: {
                    authorizedRoles: [
                        'instructor'
                    ]
                }
            })
            .state('modal.subscribe-success-modal', {
                url: '/subscribe/success',
                data: {
                    pageTitle: 'Subscribe Successful',
                    reloadNextState: true
                },
                views: {
                    'modal@': {
                        templateUrl: 'subscribe/subscribe-success-modal.html',
                        controller: function ($scope, $log, $stateParams, $previousState) {
                            $previousState.forget('modalInvoker');
                        }
                    }
                }
            })
            .state('root.subscribe.packages', {
                url: '/packages',
                resolve: {
                    packages: function (LicenseService) {
                        return LicenseService.getPackages();
                    }
                } ,
                views: {
                    'main@': {
                        templateUrl: 'subscribe/packages.html',
                        controller: 'SubscribePackagesCtrl'
                    }
                }
            });
    })
    .controller('SubscribeUpgradeCtrl', function ($scope, $state, $stateParams, $rootScope, $window, AUTH_EVENTS, packages, LicenseService, UserService, REGISTER_CONSTANTS) {

        // Setup Seats and Package choices
        var selectedPackage = _.find(packages.plans, {name: $stateParams.packageType || "Chromebook/Web"});
        var packagesChoices = _.map(packages.plans, 'name');

        $scope.packages = {
            choices: packagesChoices,
            selected: selectedPackage,
            selectedName: selectedPackage.name
        };

        $scope.seats = {
            choices: packages.seats,
            selectedNumber: $stateParams.seatsSelected || 10
        };

        $scope.$watch('packages.selectedName', function (packageName) {
            $scope.packages.selected = _.find(packages.plans, {name: packageName});
        });

        $scope.changePackage = function () {};


        // School and Payment Info
        $scope.info = {
            school: {
                name: null,
                zipCode: null,
                address: null,
                state: "California",
                city: null
            },
            subscription: {},
            CC: {
                name: null,
                cardType: "Visa",
                number: null,
                exp_month: null,
                exp_year: null,
                cvc: null
            },
            PO: {
                name: null,
                phone: null,
                email: null,
                number: null
            }
        };

        $scope.states = REGISTER_CONSTANTS.states;
        $scope.cardTypes = ["Visa", "MasterCard", "American Express", "Discover", "Diners Club", "JCB"];

        $scope.isPaymentCreditCard = true;

        $scope.request = {
            success: false,
            errors: [],
            isSubmitting: false
        };

        $scope.calculateTotal = function (price, seatChoice) {
            var targetPackage = _.find($scope.seats.choices, {studentSeats: parseInt(seatChoice)});
            var total = seatChoice * price;
            return total - (total * (targetPackage.discount / 100));
        };

        $scope.submitPayment = function (studentSeats, packageName, info) {

            // stripe request
            //if (!Stripe.card.validateCardNumber(info.CC.number)) {
            //  $scope.request.errors.push("You entered an invalid Credit Card number");
            //}
            //if (!Stripe.card.validateExpiry(info.CC.exp_month, info.CC.exp_year)) {
            //    $scope.request.errors.push("You entered an invalid expiration date");
            //}
            //if (!Stripe.card.validateCVC(info.CC.cvc)) {
            //    $scope.request.errors.push("You entered an invalid CVC number");
            //}
            //if (!Stripe.card.cardType(info.CC.cardType)) {
            //    $scope.request.errors.push("You entered an invalid CVC number");
            //}

            if ($scope.request.errors < 1) {
                Stripe.setPublishableKey('pk_test_0T7q98EI508iQGcjdv1DVODS');
                Stripe.card.createToken({
                    name: 'charles',
                    number: 4242424242424242,
                    exp_month: 1,
                    exp_year: 2020,
                    cvc: 123
                }, function (status, stripeToken) {
                    _subscribeToLicense(studentSeats, packageName, stripeToken, info.school);
                });
            }
        };

        var _subscribeToLicense = function (studentSeats, packageName, stripeInfo) {

            $scope.request.isSubmitting = true;
            $scope.request.errors = [];

            var targetSeat = _.find($scope.seats.choices, {studentSeats: parseInt(studentSeats)});
            var targetPlan = _.find(packages.plans, {name: packageName});

            LicenseService.subscribeToLicense({planInfo: {type: targetPlan.planId, seats: targetSeat.seatId}, stripeInfo: stripeInfo}).then(function(response) {
                $scope.request.errors = [];
                $scope.request.isSubmitting = false;
                $scope.request.success = true;
                UserService.updateUserSession(function() {
                    $state.go('modal.subscribe-success-modal');
                });
            }, function (response) {
                $scope.request.isSubmitting = false;
                $scope.request.errors = [];
                $scope.request.errors.push(response.data.error);
            });
        };

    })
    .controller('SubscribePackagesCtrl', function ($scope, packages) {
        $scope.seatChoices = [];
        $scope.packageChoices = packages.plans;

        angular.forEach(packages.seats, function (pack) {
            $scope.seatChoices.push(pack.studentSeats);
        });

        angular.forEach($scope.packageChoices, function(pack) {
           pack.seatsSelected = $scope.seatChoices[0];
        });

        $scope.calculateTotal = function(price,seatChoice) {
            var targetPackage = _.find(packages.seats, {studentSeats: seatChoice});
            var total = seatChoice * price;

            return total - (total* (targetPackage.discount/100));
        };
    });