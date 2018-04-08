import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import chrome from 'ui/chrome/chrome';
import indexTemplate from 'plugins/kibana/login/login.html';
import $ from 'jquery';
import 'plugins/kibana/login/style/login.less';


uiRoutes
  .when('/login', {
    template: indexTemplate
  });

uiModules
  .get('apps/login')
  .controller('kbnLoginApp', function ($scope, $http, $location, $translate, Notifier, $window, $cookies, $cookieStore,$modal, $log) {
    //该模块是在原来router的基础上，添加了一个login的路由，界面的头部和左侧页面是采用显示隐藏来实现的
    $(document.body).find('.app-wrapper').attr('id', 'app-wrapper-login');
    //跳转后台管理页面，顺便指定当前的语言
    let protocol = $location.protocol();
    let host = $location.host();
    let curlang = window.localStorage.lang || 'zh-cn';
    $scope.adminUrl = `${protocol}://${host}:8080?curlang=${curlang}`
    $scope.langList = [
      {'title': '简体中文', 'value': 'zh-cn'},
      {'title': '繁體中文', 'value': 'zh-tw'},
      {'title': 'English', 'value': 'en-us'}
    ];
    $scope.curLang = $translate.use();
    $scope.setLang = function (language) {
      $translate.use(language);
      window.localStorage.lang = language;
      window.location.reload();
    };


    //登陆
    $scope.usernameError = false;//检查用户名
    $scope.passwordError = false;//检查密码
    $scope.systermError = false;//服务异常！


    $scope.loginSubmit = function () {
      if ($scope.username === '' || $scope.username === undefined || $scope.password === '' || $scope.password === undefined) {
        if ($scope.username === '' || $scope.username === undefined) {
          $scope.usernameError = true;//检查用户名
          $scope.passwordError = false;//检查密码
          $scope.systermError = false;//服务异常！
          $scope.errorMessge = false;
        } else if ($scope.password === '' || $scope.password === undefined) {
          $scope.usernameError = false;//检查用户名
          $scope.passwordError = true;//检查密码
          $scope.systermError = false;//服务异常！
          $scope.errorMessge = false;
        }
      } else {
        let data = {
          'loginName': $scope.username,
          'password': $scope.password
        };
        $http.post('/manager/auth/login', data).success(function (res, status) {
          if (status === 200) {
            let token = res.token;
            let userId = res.userId;
            $scope.token = token;
            $scope.userId = userId;
            $http.get(`/manager/user/${$scope.userId}`).success(function (res, status) {
              if (status === 200) {
                let displayName = res.displayName;
                $cookieStore.put('currentUserApp', JSON.stringify({
                  loginName: $scope.username,
                  token: token,
                  userId: userId,
                  displayName: displayName
                }));
                $scope.$emit('displayName_parent_controller', displayName);
                $location.path('/discover');
              } else if (status === 202) {
                $scope.usernameError = false;//检查用户名
                $scope.passwordError = false;//检查密码
                $scope.systermError = false;//服务异常！
                $scope.errorMessge = true;
                $scope.errorCode = res.code + 'authlogin';
              }
            }).error(function (res, status) {
              $scope.usernameError = false;//检查用户名
              $scope.passwordError = false;//检查密码
              $scope.systermError = true;//服务异常！
              $scope.errorMessge = false;
            });
          } else if (status === 202) {
            $scope.usernameError = false;//检查用户名
            $scope.passwordError = false;//检查密码
            $scope.systermError = false;//服务异常！
            $scope.errorMessge = true;
            $scope.errorCode = res.code + 'authlogin';
          }
        }).error(function (res, status) {
          $scope.usernameError = false;//检查用户名
          $scope.passwordError = false;//检查密码
          $scope.systermError = true;//服务异常！
          $scope.errorMessge = false;
        });
      }
    };

    //获取产品信息
    var getProductInfo = function () {
      $http.get('/manager/productInfo').success(function (res, status) {
        $scope.productInfo = res;
      }).error(function (res, status) {
        if (status === 502) {
          $scope.systermError = true;//服务异常！
        } else {
          $scope.errorMessge = res.message;
        }

      });
      $http.get('/v1/version').success(function (res, status) {
        $scope.version = res;
      }).error(function (res, status) {
        if (status === 502) {
          $scope.systermError = true;//服务异常！
        } else {
          $scope.errorMessge = res.message;
        }

      });

    };
    getProductInfo();
    let myDate = new Date();
    $scope.fullYear = myDate.getFullYear(); //获取完整的年份(4位,1970-????)
    $scope.enterEvent = function (e) {
      var keycode = window.event ? e.keyCode : e.which;
      if (keycode === 13) {
        $scope.loginSubmit();
      }
    };
  });


