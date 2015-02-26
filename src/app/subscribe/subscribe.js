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
                        controller: 'SubscribePaymentCtrl'
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
    .controller('SubscribePaymentCtrl', function ($scope, $state, $stateParams, $rootScope, $window, AUTH_EVENTS, packages, LicenseService, UtilService, UserService, REGISTER_CONSTANTS) {

        // Setup Seats and Package choices
        var selectedPackage = _.find(packages.plans, {name: $stateParams.packageType || "Chromebook/Web"});
        var packagesChoices = _.map(packages.plans, 'name');

        $scope.status = {
            isPaymentCreditCard: true,
            packageName: selectedPackage.name,
            selectedPackage: selectedPackage,
            studentSeats: $stateParams.seatsSelected || 10
        };

        $scope.promoCode = {
            code: null,
            valid: false,
            amount_off: 0,
            percent_off: 0
        };

        $scope.choices = {
            packages: packagesChoices,
            seats: packages.seats,
            states:REGISTER_CONSTANTS.states,
            cardTypes:REGISTER_CONSTANTS.cardTypes
        };

        $scope.$watch('status.packageName', function (packageName) {
            $scope.status.selectedPackage = _.find(packages.plans, {name: packageName});
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
            CC: REGISTER_CONSTANTS.ccInfo,
            PO: REGISTER_CONSTANTS.poInfo
        };

        $scope.request = {
            success: false,
            errors: [],
            isSubmitting: false
        };

        $scope.requestPromo = {
            success: false,
            errors: [],
            isSubmitting: false
        };

        $scope.applyPromoCode = function () {
            UtilService.submitFormRequest($scope.requestPromo, function () {
                return LicenseService.stripeRequestPromo($scope.promoCode.code);
            }, function (response) {
                console.log('applied:', response);

                // Set default discounts to 0, since we can simply apply both
                $scope.promoCode.amount_off = 0;
                $scope.promoCode.percent_off = 0;

                // Check for the actual amount and percentage off
                if( response.data.amount_off ) {
                    $scope.promoCode.valid = true;
                    $scope.promoCode.amount_off = response.data.amount_off;
                }
                else if( response.data.percent_off ) {
                    $scope.promoCode.valid = true;
                    $scope.promoCode.percent_off = response.data.percent_off;
                }
            });
        };

        $scope.calculateTotal = function (price, seatChoice) {
            var targetPackage = _.find($scope.choices.seats, {studentSeats: parseInt(seatChoice)});
            var total = seatChoice * price;
            total = total - (total * (targetPackage.discount / 100));

            // apply a promo code if it's valid
            if( $scope.promoCode.valid ) {
                total = total - ($scope.promoCode.amount_off / 100);
                total = total - (total * ($scope.promoCode.percent_off / 100));
            }

            // Return the final total
            return total;
        };

        $scope.submitPayment = function (studentSeats, packageName, info, test) {
            if (test) {
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
                return;
            }

            LicenseService.stripeValidation(info.CC, $scope.request.errors);

            if ($scope.request.errors < 1) {
                Stripe.setPublishableKey('pk_test_0T7q98EI508iQGcjdv1DVODS');
                Stripe.card.createToken(info.CC, function (status, stripeToken) {
                    _subscribeToLicense(studentSeats, packageName, stripeToken, info.school);
                });
            }
        };

        var _subscribeToLicense = function (studentSeats, packageName, stripeInfo) {

            var targetSeat = _.find($scope.choices.seats, {studentSeats: parseInt(studentSeats)});
            var targetPlan = _.find(packages.plans, {name: packageName});

            // Attach the promo code as a "coupon" to stripeInfo if it is valid
            if( $scope.promoCode.valid ) {
                stripeInfo.coupon = $scope.promoCode.code;
            }

            UtilService.submitFormRequest($scope.request, function() {
                return LicenseService.subscribeToLicense({planInfo: {type: targetPlan.planId, seats: targetSeat.seatId}, stripeInfo: stripeInfo});
            }, function() {
                return UserService.updateUserSession(function () {
                    $state.go('modal.subscribe-success-modal');
                });
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