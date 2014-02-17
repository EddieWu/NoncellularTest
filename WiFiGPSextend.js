var PXIouterTxLoss = 40;
var PXIouterRxLoss = 40;
var PXISIGGENAddr = "GPIB0::20::INSTR";
var PXIDIGIAddr = "GPIB0::20::INSTR";
var PXICOMBAddr = "GPIB0::20::INSTR";


var DoWifi = true;
var DoBlueTooth = true;
var DoGPS = false;

var DoWifiRx = true;
var DoBlueToothRx =  true;

var StopCondition = false;

var WlanPwrMin=10,WlanPwrMax=20,WlanCurrentEvm=[-25,35],WlanMaxFreq=25,WlanSEM=0; // Wlan发射标准
var PerLimitArr = [10,8]; //11M %8,54M %10 // Wlan接收标准
var BTAvgPwrMin = -6,BTAvgPwrMax=20; //蓝牙发射功率标准
var m_BT_BER_limit = 0.1; // 蓝牙接收标准

var GPSBaseLevel =  -100; //
// (CNR:carrier-to-noise ratio )(SNR；Signal-to-Noise Ratio)
// 	CNR_Mean,Phase,TCXO_Offset,TCXO_Drift,CNR_Sigma,UpdateHz,Acquisition,BitSync,m_SVid	
var GPSConfig = "40,0.85,42.92,0.8184,1,10,10,5,29";

var ExtTryMax = 3;  // 最大尝试次数


////////////////////////////////////
var Task_WIFI_SET_TX_CFG		= 0;
var TASK_WIFI_Change_CHANNEL	= 1;
var TASK_WIFI_Change_TX_RATE	= 2;
var TASK_WIFI_TX_START			= 3;
var TASK_WIFI_TX_STOP			= 4;
var TASK_WIFI_RX_START			= 5;
var TASK_WIFI_RX_QUERY			= 6;
var TASK_WIFI_RX_STOP			= 7;

var Task_BT_SET_TX_CFG			= 0;
var Task_BT_SET_RX_CFG			= 1;
var TASK_BT_TX_START			= 2;
var TASK_BT_TX_STOP				= 3;
var TASK_BT_RX_START			= 4;
var TASK_BT_RX_STOP				= 5;
var TASK_BT_ENTER_TEST_MODE		= 6;
var TASK_BT_Change_PCL			= 7;
var TASK_BT_READ_BT_ADDRESS		= 8;

var PXIDeviceWIFI				= 0;
var PXIDeviceSIGGEN				= 1;
var PXIDeviceBT					= 2;
var PXIDeviceCOMBINER			= 3;
var PXIDeviceDigitizer			= 4;

var Ret;
////////////////////
WinMain.PXIOpened = false;
WinMain.PXIWiFiFirst = true ; // Wifi is first

var tmpObjLog = {};// 临时变量
var RfType; // 仪器类型
var GlobalSigArbFileArr=[ 
	[ ['d:\\huaqin\\802-11a_54Mbps_1000oct - MAC.aiq','d:\\huaqin\\11b11MHz.aiq'],
		'd:\\huaqin\\BT_AABBCCDDEEFF.aiq','d:\\huaqin\\GPS_generation_6000.aiq'
	],
	[ ['d:\\huaqin\\LPmod\\WiFi_OFDM-54.mod','d:\\huaqin\\LPmod\\WiFi_CCK-11L.mod'],
		'd:\\huaqin\\LPmod\\1DH1_000088C0FFEE.mod','d:\\huaqin\\GPS_generation_6000.aiq'
	],
	//20130329 add Start
	[ ['MV887030A_ag_54_1000','MV887030A_b_11_1024L'],
		'BT','GPS'
	],
	//20130329 add End
	//20130330 add Start
	[ ['D:\\Rohde-Schwarz\\CMW\\Data\\waveform\\Wifi_g_54Mbps_1000Byte_001122334455_100ns.wv','D:\\Rohde-Schwarz\\CMW\\Data\\waveform\\Wifi_b_11Mbps_1024Byte_001122334455_100ns.wv'],
		'D:\\Rohde-Schwarz\\CMW\\Data\\waveform\\DH1_000088C0FFEE.wv','D:\\Rohde-Schwarz\\CMW\\Data\\waveform\\gps29_15S_1.wv'
	]
	//R&S Modify
	//DH1_AABBCCDDEEFF.wv->DH1_000088C0FFEE.wv
	//GPS_default.wv->gps29_15S_1.wv
	//20130330 add End
];
				
var ExtTestFun = function()
{
if( CfgCurrent.SetupIniHash.SystemSetting.RfTesterInstrument =='pxi3000')RfType=0;
if( CfgCurrent.SetupIniHash.SystemSetting.RfTesterInstrument =='iqflex'){RfType=1;}
//20130329 add Start
if( CfgCurrent.SetupIniHash.SystemSetting.RfTesterInstrument =='mt8870'){RfType=2;}
//alert(CfgCurrent.SetupIniHash.SystemSetting.RfTesterInstrument);
//20130329 add End
//20130329 add Start
if( CfgCurrent.SetupIniHash.SystemSetting.RfTesterInstrument =='cmw500'){RfType=3;}
//alert(CfgCurrent.SetupIniHash.SystemSetting.RfTesterInstrument);
//20130329 add Start

if( typeof(WinThread.Platform) == 'function')
{
	WinThread.Platform.prototype.DoExternWIFIBTGPS_FT = function(tmpTest,objLog)
	{
		var RunLog = WinMain.RunLog;
		var rf = ObjRfTester.object;
		var obj = this.object;
		tmpObjLog = objLog;
		//Data.CalibrationTest.Count= 3;
		//MainThread.setProcess();
		//RunLog.append(obj.COM_ReadSN());
		//objLog.txtLog = objLog.strLog 
		//debugger;
		var str;
		var res;
		// 打开设备
		if( !WinMain.PXIOpened ){
			rf.PXI3Close(PXIDeviceWIFI);
			rf.PXI3Close(PXIDeviceBT);
			rf.PXI3Close(PXIDeviceSIGGEN);
			rf.PXI3Close(PXIDeviceCOMBINER);
			rf.PXI3Close(PXIDeviceDigitizer);

			// Digitizer_Open()  ///
			// Digitizer_Close
			AddLog("Open Device CMW500");
			Ret = rf.PXI3Open(PXIDeviceDigitizer,PXIDIGIAddr);
			if(Ret != 0) AddLog( "CMW500 Open Device FAIL"+rf.GetRFTestLog());
			
			Ret = rf.PXI3Open(PXIDeviceSIGGEN,PXISIGGENAddr);
			if(Ret != 0) AddLog( "CMW500 Open Device SIGGEN FAIL");
			Ret = rf.PXI3Open(PXIDeviceCOMBINER,PXICOMBAddr);
			if(Ret != 0) AddLog( "CMW500 Open Device COMBINER FAIL");
			// WinMain.PXIWiFiFirst = true ;Wifi is first
			
			// WinMain.PXIWiFiFirst = true ;Wifi is first
			//AddLog("Open Device WIFI");
			Ret = rf.PXI3Open(PXIDeviceWIFI,PXIDIGIAddr);
			if(Ret != 0) AddLog( "CMW500 Open Device WIFI FAIL");
			// SIGGEN_Init   // 信号始终

			WinMain.PXIOpened = true;
		}
		// 功能模块大循环
		//  for reduce Open WIFI/BT time
		WinMain.PXIWiFiFirst =!WinMain.PXIWiFiFirst;
		for(var funcId=0;funcId<2;funcId++)
		{
		if( (funcId==0&&!WinMain.PXIWiFiFirst) || (funcId==1&&WinMain.PXIWiFiFirst) )
		{
			if(!DoWifi)continue;
			if( funcId == 1){
				rf.PXI3Close(PXIDeviceBT);
				AddLog("CMW500 Open Device WIFI");
				Ret = rf.PXI3Open(PXIDeviceWIFI,PXIDIGIAddr);
				if(Ret != 0) AddLog( "CMW500 Open(Device WIFI FAIL");
			}
			
			// WIFI 发射测试
			AddLog('Start wifi tx test ........................................');
			var freq = 2412e6;
			// 读取仪器内部线损
			var innerTxLoss = rf.PXI3GetTXLoss(freq);
			// 设置线损
			var TxLoss = innerTxLoss+PXIouterTxLoss;
			// 循环 54M 11M
			var txRateArr=[11,3];var PowerArr=[12,14];
			var WlanAnalysisModeArr=[1,2];var WlanSpectralMaskTypeArr=[0,1];
			
			for(var i=0;i<2;i++)
			{
				var channel		= freq/1000;//2412000;//频率，单位为KHZ
				var bufSize			=1024;
				var bLongPreamble	=0;
				var txRate			=txRateArr[i];//1;//11:54M,3:11M
				var pktCount		=0;
				var pktInterval		=50;
				var bGainControl	=1;
				var gainControl		=40;
				var PerLimit	    =PerLimitArr[i];
				
				var wifi_tx_cfg = ExtFormat_WIFI_TX_CFG(channel,bufSize,bLongPreamble,txRate,pktCount,pktInterval,bGainControl,gainControl,PerLimit);
				//alert(wifi_tx_cfg);
				// 设置信道
				Ret = obj.IWiFiTest(Task_WIFI_SET_TX_CFG,wifi_tx_cfg,0);
				if(Ret != 0) AddLog( "Task_WIFI_SET_TX_CFG FAIL");
				Ret = obj.IWiFiTest(TASK_WIFI_Change_CHANNEL,wifi_tx_cfg,0);
				if(Ret != 0) AddLog( "TASK_WIFI_Change_CHANNEL FAIL");
				// 设置手机测试
				AddLog('Mobile tx is turn on...');
				for( var testWiFiTime=0;testWiFiTime<ExtTryMax;testWiFiTime++)
				{
					SleepTimeFun(0,200,testWiFiTime);
					Ret = obj.IWiFiTest(TASK_WIFI_TX_START,wifi_tx_cfg,0);
					if(Ret != 0) AddLog( "TASK_WIFI_TX_START FAIL");
					// afMeasureWLan_am11a afMeasureWLan_smtMask11a
					SleepTimeFun(0,200,testWiFiTime);
					AddLog('Start to measure wifi TX ...');
					res = -1;
					str = rf.PXI3DoWiFiTest(freq,PowerArr[i],TxLoss,
					WlanAnalysisModeArr[i],WlanSpectralMaskTypeArr[i],TxLoss);
					SleepTimeFun(0,200,testWiFiTime);
					Ret = obj.IWiFiTest(TASK_WIFI_TX_STOP,wifi_tx_cfg,0);
					if(Ret != 0) AddLog( "TASK_WIFI_TX_STOP FAIL");
					AddLog( obj.RunningDescription);
					obj.RunningDescription = '';
					if(str == '')
					{
						AddLog( "PXI3DoWiFiTest FAIL");
					}
					else
					{
						if(CheckWifiData(str,freq,i) )
						{
							res = 0;
							break;
						}
					}
				}
				// 结果判断显示
				if( res !=0)
				{
					// 关闭设备
					AddLog('PXI3DoWiFiTest TX FAIL ...CODE='+res+'');
					TestFinal(funcId);
					if(StopCondition)return;
				}
			}
			// 关闭设备
			//rf.PXI3Close(PXIDeviceWIFI);
			if(DoWifiRx)
			{
				// // WIFI 接收测试
				AddLog('Start to test wifi RX ........................................');
				var innerRxLoss = rf.PXI3GetRXLoss(freq);
				var RxLoss = innerRxLoss+PXIouterRxLoss;
				// 54M 11M
				var BSLevelArr=[-72,-85];
				var SigArbFileArr=GlobalSigArbFileArr[RfType][0];
				//AddLog(SigArbFileArr[0]);
				for(var i=0;i<2;i++){
					var channel		= freq/1000;//2412000;//频率，单位为KHZ
					var bufSize			=1024;
					var bLongPreamble	=0;
					var txRate			=txRateArr[i];//1;//11:54M,3:11M
					var pktCount		=0;
					var pktInterval		=50;
					var bGainControl	=1;
					var gainControl		=40;
					var PerLimit	    =PerLimitArr[i];
					
					var wifi_tx_cfg = ExtFormat_WIFI_TX_CFG(channel,bufSize,bLongPreamble,txRate,pktCount,pktInterval,bGainControl,gainControl,PerLimit);
					
					AddLog('Control PXI WIFI SIGNAL OUTPUT ON ...');
					Ret = rf.PXI3SIGGENOutput(1,freq,BSLevelArr[i]+RxLoss,SigArbFileArr[i]);
					if(Ret != 0) AddLog( "CMW500 SIGGENOutput FAIL");
					
					// 设置信道
					Ret = obj.IWiFiTest(Task_WIFI_SET_TX_CFG,wifi_tx_cfg,0);
					if(Ret != 0) AddLog( "Task_WIFI_SET_TX_CFG FAIL");
					Ret = obj.IWiFiTest(TASK_WIFI_Change_CHANNEL,wifi_tx_cfg,0);
					if(Ret != 0) AddLog( "TASK_WIFI_Change_CHANNEL FAIL");
					for( var testWiFiTime=0;testWiFiTime<ExtTryMax;testWiFiTime++)
					{
						SleepTimeFun(0,200,testWiFiTime);
						Ret = obj.IWiFiTest(TASK_WIFI_RX_START,wifi_tx_cfg,1);
						if(Ret != 0) AddLog( "TASK_WIFI_RX_START FAIL");
						//debugger;
						SleepTimeFun(2000,200,testWiFiTime);
						AddLog('Start to query wifi RX PER ...');
						res = Ret = obj.IWiFiTest(TASK_WIFI_RX_QUERY,wifi_tx_cfg,1);
						if(Ret != 0) AddLog( "TASK_WIFI_RX_QUERY FAIL");
						SleepTimeFun(0,200,testWiFiTime);
						Ret = obj.IWiFiTest(TASK_WIFI_RX_STOP,wifi_tx_cfg,1);
						if(Ret != 0) AddLog( "IWiFiTest TASK_WIFI_RX_STOP FAIL");
						
						str =obj.RunningDescription;
						obj.RunningDescription = '';
						AddLog( str);
						if(res == 0)
						{
							break;
						}
					}
					Ret = rf.PXI3SIGGENOutput(0,freq,0,'');
					if(Ret != 0) AddLog( "PXI3SIGGENOutput STOP FAIL");
					if( res !=0)
					{
						// 关闭设备
						AddLog('PXI3DoWiFiTest RX FAIL ...CODE='+res+'');
						TestFinal(funcId);
						if(StopCondition)return;
					}
				}
			}
		}else
		{
			if(!DoBlueTooth)continue;
			// 蓝牙发射测试
			if( funcId == 1){
				rf.PXI3Close(PXIDeviceWIFI);
				AddLog("Open PXIDeviceBT");
				Ret = rf.PXI3Open(PXIDeviceBT,PXIDIGIAddr);
				if(Ret != 0) AddLog( "PXIDeviceBT Open FAIL");
			}
			AddLog('Start BT TX test ........................................');
			var testType=1;  //tx
			var pattern=4;   //"pseudorandom bit sequence"
			var freq_type=0; //single freq		
			var uc_freq=0;  //freq [1-78]
			var freq = 2402e6;
			var packet_type=4;	//4:"DH1"; 11:"DH3" ; 15:"DH5" ...	
			var data_len=17;    //[0-255]
			var uc_poll_period=2;  //
			var e_whiten=0;			//
			var e_modulation=0;	    //
			var e_power_ctrl=0;     //
			var uc_pcl=7;		    
			var s_access_code="";

			// 读取仪器内部线损
			var innerTxLoss = rf.PXI3GetTXLoss(freq);
			// 设置线损
			var TxLoss = innerTxLoss+PXIouterTxLoss;
			
			var bt_tx_cfg = ExtFormat_BT_TX_CFG(testType,pattern,freq_type,uc_freq,packet_type,data_len,uc_poll_period,e_whiten,e_modulation,e_power_ctrl,uc_pcl,s_access_code);
			Ret = obj.IBlueToothTest(Task_BT_SET_TX_CFG,bt_tx_cfg,0);
			if(Ret != 0) AddLog( "Task_BT_SET_TX_CFG FAIL");
			//read bluetooth address
			//Ret = obj.IBlueToothTest(TASK_BT_READ_BT_ADDRESS,bt_tx_cfg,1);
			for( var testBTTime=0;testBTTime<ExtTryMax;testBTTime++)
			{
				// 蓝牙发射测试
				//Ret = obj.IBlueToothTest(TASK_BT_ENTER_TEST_MODE,bt_tx_cfg,1);
				//start bluetooth tx on
				Ret = obj.IBlueToothTest(TASK_BT_TX_START,bt_tx_cfg,0);
				if(Ret != 0) AddLog( "TASK_BT_TX_START FAIL");
				// rf  int BtPacketType,long BtPayloadLen,long BtChannel,double BtRefLevel,double BtInputOffset,double externLoss
				str = rf.PXI3DoBTTest(0,27,0,5,TxLoss,TxLoss);
				//stop bluetooth tx 
				Ret = obj.IBlueToothTest(TASK_BT_TX_STOP,bt_tx_cfg,0);
				if(Ret != 0) AddLog( "TASK_BT_TX_STOP FAIL");
				//rf.PXI3Close(PXIDeviceBT);
				AddLog( obj.RunningDescription);
				obj.RunningDescription = '';
				if(str == '')
				{
					AddLog( "PXI3DoBTTest FAIL");
				}
				else
				{
					if(CheckBTData(str ))
					{
						res = 0;
						break;
					}
				}
			}
			if(res !=0)
			{
				// 关闭设备
				AddLog('PXI measure Bluetooth TX fail ...');
				TestFinal(funcId);
				if(StopCondition)return;
			}
			if(DoBlueToothRx){
				// 蓝牙接收测试
				// 仪器控制
				AddLog('Start BT RX test ........................................');
				var innerRxLoss = rf.PXI3GetRXLoss(freq);
				var RxLoss = innerRxLoss+PXIouterRxLoss;
				var BTBSLevel=-70;var SigArbFile=GlobalSigArbFileArr[RfType][1];
				rf.PXI3SIGGENOutput(1,freq,BTBSLevel+RxLoss,SigArbFile);
				Pattern = 4;
				PXPackettype =4;	//4:"DH1"; 11:"DH3" ; 15:"DH5" ...	
				RXFrequency = 0;
				var WaveFilename = SigArbFile.split('\\').pop();
				//AddLog( "WaveFilename="+WaveFilename);
				if(RfType==3) //RS
				{
					TesterAddress = WaveFilename.substr(WaveFilename.length-11,8);
				}
				else
				{
					TesterAddress = WaveFilename.substr(WaveFilename.length-12,8);//"CCDDEEFF";
				}
				//AddLog( "TesterAddress="+TesterAddress);
				var bt_rx_vfg = ExtFormat_BT_RX_CFG(Pattern,PXPackettype,RXFrequency,TesterAddress,m_BT_BER_limit);
				Ret = obj.IBlueToothTest(Task_BT_SET_RX_CFG,bt_rx_vfg,0);
				if(Ret != 0) AddLog( "Task_BT_SET_RX_CFG FAIL");
				for( var testBTTime=0;testBTTime<ExtTryMax;testBTTime++)
				{
					SleepTimeFun(0,200,testBTTime);
					Ret = obj.IBlueToothTest(TASK_BT_RX_START,bt_rx_vfg,0);
					if(Ret != 0) AddLog( "TASK_BT_RX_START FAIL");
					//ObjGeneral.Sleep(3000);
					SleepTimeFun(1600,200,testBTTime);
					res = obj.IBlueToothTest(TASK_BT_RX_STOP,bt_rx_vfg,0);
					str =obj.RunningDescription;
					obj.RunningDescription = '';
					AddLog( str);			
					if(res != 0){
						AddLog( "TASK_BT_RX_STOP FAIL code="+res);
					}
					else
					{
						break;
					}
				}
				Ret = rf.PXI3SIGGENOutput(0,freq,BTBSLevel+RxLoss,'');
				if(Ret != 0) AddLog( "PXI3SIGGENOutput FAIL");
				if(res !=0)
				{
					// 关闭设备
					AddLog('PXI measure Bluetooth RX fail ...');
					TestFinal(funcId);
					if(StopCondition)return;
				}
				//////关闭设备
				//rf.PXI3Close(PXIDeviceSIGGEN);
				//rf.PXI3Close(PXIDeviceCOMBINER);
			}
		}
		}
		if(DoGPS){
			//  GPS 1575.42
			var GPSfreq = 1575.42e6;
			var innerRxLoss = rf.PXI3GetRXLoss(GPSfreq);
			var RxLoss = innerRxLoss+PXIouterRxLoss;
			AddLog('GPS test........................................');
			var level = GPSBaseLevel+RxLoss;
			rf.PXI3SIGGENOutput(1, GPSfreq , level,GlobalSigArbFileArr[RfType][2]);
			Ret = obj.IGPSTest(0,GPSConfig );//pass config 
			if(Ret != 0) AddLog( "IGPSTest config FAIL");
			var bGPSResult = false;
			for( var testGPSTime=0;testGPSTime<ExtTryMax;testGPSTime++)
			{
				if(WinMain.Ctrl.stopFlag)
				{
					break;
				}
				AddLog( "IGPSTest open...");
				obj.IGPSTest(1,GPSConfig); //open gps
				if(Ret != 0) AddLog( "IGPSTest open FAIL");
				obj.IGPSTest(3,GPSConfig); //start gps
				if(Ret != 0) AddLog( "IGPSTest start FAIL");
				AddLog( "IGPSTest start meas...");// 添加空行
				var maxTimes =WinMain.Ctrl.MaxCount;
				for( WinMain.Ctrl.times =0;WinMain.Ctrl.times< maxTimes;WinMain.Ctrl.times++)
				{
					if(obj.ThreadFlag!=-1)
					{
						// 返回串口 或错误码(负数)
						AddLog( "IGPSTest meas result=" + obj.ThreadFlag);
						if( obj.ThreadFlag == 0 )
						{
							bGPSResult = true;
						}
						break;
					}
					if(WinMain.Ctrl.stopFlag)
					{
						obj.StopFlag = 1;
					}
					AnimalStr();
					ObjGeneral.SysSleep( WinMain.Ctrl.SlpTimes );
				}
				str =obj.RunningDescription;
				obj.RunningDescription = '';
				AddLog( str);
				obj.IGPSTest(2,GPSConfig); //close gps
				if(Ret != 0) AddLog( "IGPSTest close FAIL");

				if( bGPSResult )
				{
					break;
				}
				SleepTimeFun(200,200,testGPSTime);
				
			}
			if( !bGPSResult)
			{
				WinMain.Ctrl.errorOccur =true;
			}
			// 关闭信号
			rf.PXI3SIGGENOutput(0, GPSfreq,0,'');
			//alert(obj.COM_ReadSN());
		}
	}
}
}
//////
function AddLog(log)
{
	log = log.replace(/\n\n/g,'\n');
	WinMain.RunLog.append(log.replace(/\n/g,'<br>'));
	tmpObjLog.txtLog += log +'\n';
}
function TestFinal(funcId)
{
	//rf.PXI3Close(PXIDeviceSIGGEN);
	//rf.PXI3Close(PXIDeviceCOMBINER);
	WinMain.Ctrl.errorOccur =true;
	if( StopCondition && funcId==0)WinMain.PXIWiFiFirst=!WinMain.PXIWiFiFirst;
}
////////////////////
function ExtFormat_BT_RX_CFG(Pattern,PXPackettype,RXFrequency,TesterAddress,BT_BER_limit)
{
	var bt_rx_cfg ="";
	//Pattern		= 1:p0000, 2:"p1111", 3:"p1010", 4:"pseudo", 9:"p11110000"
	//PXPackettype	= int
	//RXFrequency	= [0-78] 两位十六进制数
	//TesterAddress = 8位十六进制数 蓝牙地址
	// BT_BER_limit= 浮点数字
	bt_rx_cfg = Pattern +","+ PXPackettype +","+ RXFrequency +","+ TesterAddress +"," + BT_BER_limit;
	return bt_rx_cfg;
};
function ExtFormat_BT_TX_CFG(testType,pattern,freq_type,uc_freq,packet_type,data_len,uc_poll_period,e_whiten,e_modulation,e_power_ctrl,uc_pcl,s_access_code)
{
	var bt_tx_cfg ="";
	//testtype		= 0:BT_RX_TEST; 1:BT_TX_TEST
	//pattern		= 1:"0000";  2:"1111";  3:"1010";  4:BT_TX_PSEUDO_RANDOM.....
	//freq_type		= 0:BT_FREQ_SINGLE=0, 1:BT_FREQ_HOPPING
	//uc_freq		= [0-255]
	//packet_type	= 4:"DH1"; 11:"DH3" ; 15:"DH5" ...
	//data_len		= [0-255]
	//uc_poll_period=[0-255]
	//e_whiten		=0:"off"  1:"ON"
	//e_modulation  =0:"off"  1:"ON";不确定
	//e_power_ctrl  =0:"off"  1:"ON"
	//uc_pcl        =[1-7]
	//s_access_code =8位十六进制数
	bt_tx_cfg = testType +","+ pattern +","+ freq_type +","+ uc_freq +"," + packet_type+"," + data_len+"," + uc_poll_period+"," + e_whiten+"," + e_modulation+"," + e_power_ctrl+"," + uc_pcl+","+s_access_code;
	return bt_tx_cfg;
};
var ExtFormat_WIFI_TX_CFG = function(channel,buffsize,bLongPreamble,tx_rate,pktCount,pktInterval,bGainControl,gainControl,PerLimit)
{
	var wifi_tx_cfg ="";
	//var bufSize			=1024;
	//var bLongPreamble	=0;
	//var txRate			=11;
	//var pktCount		=0;
	//var pktInterval		=50;
	//var bGainControl	=1;
	//var gainControl		=36;
	var bTrackAlc		=0;//default
	var bTargetAlc		=0;//default
	var targetAlcValue	=0;//default
	var txAntenna		=0;//default
	
	wifi_tx_cfg = channel+ "," + buffsize+","+ bLongPreamble +","+ tx_rate +","+ pktCount +","+ pktInterval +"," + bGainControl+","+gainControl + "," +bTrackAlc +","+bTargetAlc+","+targetAlcValue+"," +txAntenna +"," +PerLimit;
	return wifi_tx_cfg;
};
/////////////////////////////
function CheckWifiData(strData,WlanFreq,EvmIndex)
{
	var arr = strData.split(',');
	if(arr.length ==4)
	{
		var pwr = parseFloat(arr[0]);
		var evm = parseFloat(arr[1]);
		var sem = parseFloat(arr[2]);
		var freq = parseFloat(arr[3]);
		var MaxFreq = WlanFreq*WlanMaxFreq/1e6;
		var str = '{{Power:'+pwr+'}}['+WlanPwrMin+','+WlanPwrMax+'];{{EVM:'+evm+'}}['+WlanCurrentEvm[EvmIndex]+'];'+'{{SEM:'+sem+
			'}}['+WlanSEM+'];{{'+WlanFreq/1e6+'M,Freq:'+freq+'}},[+-'+MaxFreq+']';
		if( pwr>=WlanPwrMin && pwr<=WlanPwrMax && evm<=WlanCurrentEvm[EvmIndex] && sem>=WlanSEM && Math.abs(freq)< MaxFreq )
		{
			AddLog( str +' PASS');
			return true;
		}else
		{
			AddLog( str + ' FAIL');
		}
	}else
	{
		AddLog( 'Data['+strData+'] Error!' );
	}
	return false;
}
//////////////////////////////
function CheckBTData(strData)
{
	var arr = strData.split(',');
	if(arr.length ==2)
	{
		var pwr1 = parseFloat(arr[0]);
		var pwr2 = parseFloat(arr[1]);
		var str = '{{AvgPeakPower:'+pwr1+','+pwr2+'}}['+BTAvgPwrMin+','+BTAvgPwrMax+']';
		if( pwr1>=BTAvgPwrMin && pwr1<=BTAvgPwrMax && pwr2>=BTAvgPwrMin && pwr2<=BTAvgPwrMax )
		{
			AddLog( str + ' PASS');
			return true;
		}else
		{
			AddLog( str + ' FAIL');
		}
	}else
	{
		AddLog( 'Data['+strData+'] Error!' );
	}
	return false;
}
function SleepTimeFun(base,step,times)
{
	var sleeptime = base+times*step;
	AddLog( "SLEEP "+sleeptime+" S");
	ObjRfTester.object.SysSleep(sleeptime);
}
new DoUntil(function() {
		ExtTestFun();
	},function(){return WinThread.ObjectIsReady;},500);
