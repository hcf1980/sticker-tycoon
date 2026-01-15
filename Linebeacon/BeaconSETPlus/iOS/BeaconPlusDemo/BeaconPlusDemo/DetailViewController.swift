//
//  DetailViewController.swift
//  BeaconPlusDemo
//
//  Created by Minewtech on 2020/11/26.
//  Copyright © 2020 Minewtech. All rights reserved.
//

import UIKit
import MTBeaconPlus

class DetailViewController: UIViewController {
    var device: MTPeripheral?

    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = .white
        self.title = device?.framer.mac
        
        DispatchQueue.main.asyncAfter(deadline: .now()+1) {
            self.getAllBroadcast()
            self.getAllSlot()
            self.getTrigger()
        }

        
        DispatchQueue.main.asyncAfter(deadline: .now()+100) {
            print("writeTrigger")
            self.writeTrigger(peripheral: self.device!)
        }
        
        
        // If device has vibration Sensor, you can do it
//        self.vibrationType()
//        self.vibrationSensitivity()
//        self.vibrationTimeZone()
        
        
        // If device have sensor and sensor have history data, you can get it.
//        self.getSensorHistory()
        
    }
    func getAllBroadcast() -> Void {
        for frame in (device?.framer.advFrames)! {
            self.getBroadcastFrame(frame: frame)
        }
    }
    
    func getAllSlot() -> Void {
        for frame in (device?.connector.allFrames)! {
            self.getSlotFrame(frame: frame)
        }
    }
    
    func getBroadcastFrame(frame:MinewFrame) -> Void {
        switch frame.frameType {
        case .FrameiBeacon:
            let iBeacon = frame as! MinewiBeacon
            
            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "yyy-MM-dd' at 'HH:mm:ss"
            let strNowTime = timeFormatter.string(from: iBeacon.lastUpdate) as String
            
            print("iBeacon:\(iBeacon.major)--\(String(describing: iBeacon.uuid))--\( iBeacon.minor)--\(strNowTime)")
            break
        case .FrameURL:
            let url = frame as! MinewURL
            print("URL:\(url.urlString ?? "nil")--\(233)")
            break
        case .FrameUID:
            let uid = frame as! MinewUID
            print("UID:\(uid.namespaceId ?? "nil")--\(uid.instanceId ?? "nil")")
            break
        case .FrameTLM:
            let tlm = frame as! MinewTLM

            let timeFormatter = DateFormatter()
            timeFormatter.dateFormat = "yyy-MM-dd' at 'HH:mm:ss"
            let strNowTime = timeFormatter.string(from: tlm.lastUpdate) as String
            
            print("TLM--\(strNowTime)")
            break
        case .FrameDeviceInfo:
            print("DeviceInfo")
            break
        // LineBeacon
        case .FrameLineBeacon:
            let lineBeaconData = frame as! MinewLineBeacon
            print("LineBeacon:\(lineBeaconData.hwId)")
            break
            
        case .FrameMBeaconInfo:
            let mBeaconInfo = frame as! MinewMBeaconInfo
            print("miniBeaconInfo:\(mBeaconInfo.battery)")
            break
        
        default:
            print("Unauthenticated Frame")
            break
        }
    }
    
    func getSlotFrame(frame:MinewFrame) -> Void {
                
        switch frame.frameType {
        case .FrameiBeacon:
            let iBeacon = frame as! MinewiBeacon
            print("iBeacon:\(iBeacon.major)--\(String(describing: iBeacon.uuid))--\( iBeacon.minor)")
            break
        case .FrameURL:
            let url = frame as! MinewURL
            print("SlotFrame---URL:\(url.urlString ?? "nil")")
            break
        case .FrameUID:
            let uid = frame as! MinewUID
            print("SlotFrame---UID:\(uid.namespaceId ?? "nil")--\(uid.instanceId ?? "nil")")
            break
        case .FrameTLM:
            print("SlotFrame---TLM")
            break
        case .FrameDeviceInfo:
            print("SlotFrame---DeviceInfo")
            break
        // LineBeacon
        case .FrameLineBeacon:
            let lineBeaconData = device?.connector.slotHandler.slotFrameDataDic[FrameTypeString(FrameType.FrameLineBeacon)!] as? MTLineBeaconData
            print("SlotFrame---LineBeacon:\(String(describing: lineBeaconData?.lotKey))--\(lineBeaconData?.hwId ?? "")--\(String(describing: lineBeaconData?.vendorKey))")
            break
        
        case .FrameSixAxisSensor:
            print("SlotFrame---SixAxisSensor")
//            self.getSensorHistory()
            break
        
        default:
            print("SlotFrame---Unauthenticated Frame")
            break
        }
    }
    
    func writeFrame(peripheral : MTPeripheral) -> Void {
        let ib = MinewiBeacon.init()
        ib.slotNumber = 0;
        ib.uuid = "47410a54-99dd-49f9-a2f4-e1a7efe03c13";
        ib.major = 300;
        ib.minor = 30;
        ib.slotAdvInterval = 400;
        ib.slotAdvTxpower = -62;
        ib.slotRadioTxpower = -4;
        
        peripheral.connector.write(ib, completion: { (success, error) in
            if success {
                print("write success,%d",ib.slotRadioTxpower)
            }
            else {
                print(error as Any)
            }
        })
        
    }
    
    func setLineBeacon() -> Void {
   
        device?.connector.slotHandler.lineBeaconSetLotkey("0011223344556677", completion: { (success) in
            if success == true {
                print("Set LineBeacon's lotKey success")
            } else {
                print("Set LineBeacon's lotKey fail")
            }
        })
        
        device?.connector.slotHandler.lineBeaconSetHWID("0011223344", vendorKey: "00112233", completion: { (success) in
            if success == true {
                print("Set LineBeacon's hwid and vendorKey success")
            } else {
                print("Set LineBeacon's hwid and vendorKey fail")
            }
        })

    }
    
    func getTrigger() -> Void {
        let triggerData:MTTriggerData =  device?.connector.triggers[1] ?? MTTriggerData()
        
        print("TriggerData \n type:\(triggerData.type.rawValue)--advertisingSecond:\(String(describing: triggerData.value))--alwaysAdvertise:\( triggerData.always)--advInterval:\(triggerData.advInterval)--radioTxpower:\(triggerData.radioTxpower)")

    }
    
    func writeTrigger(peripheral : MTPeripheral) -> Void {
        // Tips:Use the correct initialization method for MTTriggerData
        let triggerData = MTTriggerData.init(slot: 1, paramSupport: true, triggerType: TriggerType.btnDtapLater, value: 30)
        triggerData?.always = false;
        triggerData?.advInterval = 100;
        triggerData?.radioTxpower = -20;
        
        peripheral.connector.writeTrigger(triggerData) { (success) in
            if success {
                print("write triggerData success")
            }
            else {
                print("write triggerData failed")
            }
        }
    }
    
    func getSensorHistory() {
        
        self.device?.connector.sensorHandler.readSixAxisSensorHistory({ (data) in
            let sensorData = data as! MTSensorSixAxisData

            if sensorData.endStatus == .none {

                if sensorData.sixAxisType == .acc {
                    print("Acc:\(sensorData.accXAxis)-\(sensorData.accYAxis)-\(sensorData.accZAxis)")
                } else if sensorData.sixAxisType == .deg {
                    print("Deg:\(sensorData.degXAxis)-\(sensorData.degYAxis)-\(sensorData.degZAxis)")
                }
            }
            else if sensorData.endStatus == .success {
                // Success
                
            }
            else if sensorData.endStatus == .error {
                // Failed
                
            }
        })
    }
    
    func vibrationSensitivity() {
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0.1) {
            
//            MTSensitivityTypeSuperHigh,
//            MTSensitivityTypeHigh,
//            MTSensitivityTypeMiddle,
//            MTSensitivityTypeLow,
//            MTSensitivityTypeSuperLow,
//            MTSensitivityTypeError,
            self.device?.connector.sensorHandler.setSensitivity(.superHigh, completionHandler: { (isSuccess) in
                
            })
        }
        
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0.2) {
            
            self.device?.connector.sensorHandler.querySensitivity({ (isSuccess, type) in
                
            })
        }

    }
    
    func vibrationType() {
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0.3) {
            
            self.device?.connector.sensorHandler.setVibrationStatus(.open, completionHandler: { (isSuccess) in
                
            })
        }
        
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0.4) {
            
//            MTVibrationTypeOpen,
//            MTVibrationTypeClose,
//            MTVibrationTypeError,
            self.device?.connector.sensorHandler.queryVibrationStatu({ (isSuccess, type) in
                
                
            })
        }
    }
    
    func vibrationTimeZone() {
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0.5) {
            
            self.device?.connector.sensorHandler.setFirstAlarmTimeIntervalWithAlarmStatus(.open, startTime: 21060, endTime: 79260, completionHandler: { isSuccess in
                
            })
        }
        
        DispatchQueue.main.asyncAfter(deadline: DispatchTime.now() + 0.6) {
            
            self.device?.connector.sensorHandler.queryFirstAlarmTimeInterval({ isSuccess, type, startTime, endTime in
                // timeZone = hours*3600 + minutes*60
                print("queryAlarmTimeZone:\(isSuccess)--\(startTime):\(startTime/3600)hour \(startTime%3600/60)minute--\n--\(endTime):\(endTime/3600)hour \(endTime%3600/60)minute")

            })

        }
    }
    
    func setBroadcastRate() {
        // When setting the broadcast rate, the incoming array has six values, and each value corresponds to six channels. 0 means that the broadcast rate of Bluetooth 4.0 is 1M hz, and 1 means that the broadcast rate of Bluetooth 5.0 is 125k hz.
        // It should be noted that iOS currently cannot obtain broadcast packets with a broadcast frequency of 125 kHz, and Android does not have this problem. That is, the frame channel of the Bluetooth 5.0 broadcast rate is set to 125kHz on iOS. After the setting is completed, the frame cannot be scanned on the iPhone, but the frame can be scanned on the Android.
        self.device?.connector.sensorHandler.queryBroadcastSpeed({ isSuccess, broadcastSpeedOfSlotArray in
            
            print("The broadcast rate of the first channel is %@", broadcastSpeedOfSlotArray[0] as! Int == 1 ? "Bluetooth5.0 125kHz" : "Bluetooth4.0 1M")
        })
        
        // When setting the broadcast rate, the incoming array has six values, and each value corresponds to six channels. 0 means that the broadcast rate of Bluetooth 4.0 is 1M, and 1 means that the broadcast rate of Bluetooth 5.0 is 125KHz. For example, if the first and second channels are set to 125KHz broadcast, and the other channels are set to 1M broadcast, then the settings are as follows:
        self.device?.connector.sensorHandler.setBroadcastSpeed([1, 1, 0, 0, 0, 0], completionHandler: { isSuccess in
            
        })
        
    }
    
    func setParmForSpecialAccSensor() {
        
        self.device?.connector.sensorHandler.queryAccSensorParameter(completionHandler: { isSuccess, odr, wakeupThreshold, wakeupDuration in
            
        })
        
        /**
         ODR ( Output rate ) : 0,1,2,3,4,5,6,7,8 correspond to 1Hz, 10Hz, 25Hz, 50Hz, 100Hz, 200Hz, 400Hz, 1600Hz ( low power ) , 1344HZ ( HR/normal ) / 5000HZ ( low power ) respectively
         wakeup_threshold ( mg ) : 0 ~ 2000
         wakeup_duration  ( ms ) : 0 ~ 127000
         */
        self.device?.connector.sensorHandler.setAccSensorParameterWithOdr(0, wakeupThreshold: 200, wakeupDuration: 1000, completionHandler: { isSuccess in
            
        })
        
    }
}
