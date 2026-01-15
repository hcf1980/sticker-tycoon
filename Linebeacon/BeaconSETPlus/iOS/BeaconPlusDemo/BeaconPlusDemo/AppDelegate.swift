//
//  AppDelegate.swift
//  BeaconPlusDemo
//
//  Created by Minewtech on 2019/4/18.
//  Copyright © 2019 Minewtech. All rights reserved.
//

import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // 后台任务标识
//    var backgroundTask:UIBackgroundTaskIdentifier! = nil
    

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        
        window = UIWindow()
        window?.backgroundColor = UIColor.lightGray
        window?.rootViewController = UINavigationController(rootViewController:ViewController())
        window?.makeKeyAndVisible()
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }


    func applicationDidEnterBackground(_ application: UIApplication) {
        
//        // 延迟程序静止的时间
//        DispatchQueue.global().async() {
//            //如果已存在后台任务，先将其设为完成
//            if self.backgroundTask != nil {
//                application.endBackgroundTask(self.backgroundTask)
//                self.backgroundTask = UIBackgroundTaskIdentifier.invalid
//            }
//        }
//
//        //如果要后台运行
//        self.backgroundTask = application.beginBackgroundTask(expirationHandler: {
//            () -> Void in
//            //如果没有调用endBackgroundTask，时间耗尽时应用程序将被终止
//            application.endBackgroundTask(self.backgroundTask)
//            self.backgroundTask = UIBackgroundTaskIdentifier.invalid
//        })
    }


    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }


}

