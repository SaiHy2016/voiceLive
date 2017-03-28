const url=location.search,reg2=/user_type=(\d+)/,user_type=(url.match(reg2)&&url.match(reg2)[1])||1;
console.log('user_type= '+user_type);

var obj={//我的全局变量,如需要可以用vuex插件管理状态
	getMsg:[],//用户即时消息
	anchorShowMsg:[],//主播主页面显示消息
	views:[0],//观看人数
	hHistory:[],//聊天室总消息
	audioCurr:'',//当前播放的语音的id
	audioNum:0,
	computedTime:function (int) {//计算时间间隔并更新vm
		if(int<0){
			int=0
			vm.showLivingTime=false
			clearInterval(vm.timer)
			vm.timer=null
		}
		var o={
				days:'00',
				hours:'00',
				minutes:'00',
				seconds:'00'
			}
		if(int>24*60*60){
			var dd=Math.floor(int/(24*60*60));
			int%=24*60*60
			dd=dd>9?dd:'0'+dd
			o.days=dd
		}
		if(int>60*60){
			var hh=Math.floor(int/(60*60))
			int%=60*60
			hh=hh>9?hh:'0'+hh
			o.hours=hh
		}
		if(int>60){
			var mm=Math.floor(int/(60))
			int%=60
			mm=mm>9?mm:'0'+mm
			o.minutes=mm
		}
		int=parseInt(int)
		o.seconds=int>9?int:'0'+int
		vm.countdown=o
	},
	timer:null,//关闭结果弹窗的定时器
	w:window.innerWidth,
	h:window.innerHeight
};

var socket = io('ws://th7.jz100.com:20000');
socket.on('connect',function () {
	console.log('链接成功')
	if(vm.items.length==0&&vm.chatRoomLists.length==0){
	}else{
		vm.showMain=false
		window.location.reload(true)
	}
})
socket.on('getStartTime',function (s) {//开播时间
	var d=new Date(s*1000),
		n=d.toLocaleDateString().replace(/\//g,'-'),
		t=d.toTimeString().match(/(\d{1,2}:\d{1,2}:\d{1,2})/)[1];
	vm.livingTime=n+' '+t
	var now=new Date()-0,
		int=(s*1000-now)/1000;//转化成秒
	//倒计时
	if(int>0){
		vm.showLivingTime=true
		obj.computedTime(int)
		vm.timer=setInterval(function () {
			int--
			obj.computedTime(int)
		},1000)
	}
})
socket.on('audienceNewMsg', function (o) {//听众新消息
	console.log('听众消息audienceNewMsg')
	console.log(o)
	obj.hHistory.unshift(o)
	if(obj.getMsg.length<3){
		obj.getMsg.push({content:o.content,msg_type:o.msg_type,avatarURL:o.avatarURL})
	}else {
		obj.getMsg.shift()
		obj.getMsg.push({content:o.content,msg_type:o.msg_type,avatarURL:o.avatarURL})
	}
});
socket.on('hostNewMsg',function (o) {//主播新消息
	console.log('主播信息hostNewMsg')
	console.log(o)
	vm.items.push(o)
	vm.stepShow++
	if(user_type!=3){//主播发完信息回到最底部
		vm.$nextTick(function () {
			location.href='#bottom'
		})
	}
})
socket.on('loginSuccess',function (num) {//观看总人数
	console.log('总人数 '+num)
	obj.views.pop();
	obj.views.push(num)
})
socket.on('errorParams',function (str) {//错误信息提示
	console.log(str);
})
socket.on('audienceHistory',function (o) {//听众历史消息
	console.log('听众历史消息audienceHistory= ');
	console.log(o);
	obj.hHistory=obj.hHistory.concat(o)
	vm.chatRoomLists=obj.hHistory
	for(var i=0;i<o.length;i++){//右上角三条即时消息
		if(i>2){break}
		obj.getMsg.unshift(o[i])
	}
})
socket.on('hostHistory',function (o) {//主播历史消息
	console.log('主播历史消息hostHistory= ');
	console.log(o);
	vm.items=o
})
socket.on('rewardResult',function (o) {//打赏结果
	console.log('打赏result')
	console.log(o)
	obj.timer=setInterval(function () {//返回结果后3秒关闭弹出层
		vm.toPayWater=false
		//关闭窗口的定时器
		if(obj.timer){
			clearInterval(obj.timer)
			obj.timer=null
		}
	},3000)
	vm.hasResult=true
	vm.waitingResult=false//等待结束
	vm.rewardRes=o
})
socket.on('rewardNewMsg',function (o) {//向主播页推送消息
	console.log('打赏新消息')
	console.log(o)
	vm.items.push(o)
	vm.stepShow++
	if(user_type!=3){//主播发完信息回到最底部
		setTimeout(function () {
			location.href='#bottom'
		},100)
	}
})

Vue.component('my-content',{
	template:'#my-content-template',
	props:['item'],
	data:function () {
		return {
			msg_type:this.item.msg_type,//1为语音，2为图片，3为主播发的文字
			msg_content:this.item.content,
			audio_src:this.item.resourceURL,
			audio_dur:this.item.voice_duration,
			isPlay:false,
			vLength:'15vw',//默认最小15vw最大59vw
			id:0,
			isErr:false,
			imgSrc:'img/audio.png'
		}
	},
	methods:{
		fullScreen:function (event) {//图片全屏
			vm.imgRatio=event.target.width/event.target.height
			vm.backgroundImage='url('+this.audio_src+')'

			// if(vm.imgRatio>=1){
			// 	var ih=obj.w/vm.imgRatio;
			// 	vm.bgpX=0
			// 	vm.bgpY=parseInt((obj.h-ih)/2)
			// }else{
			// 	var iw=obj.h*vm.imgRatio;
			// 	vm.bgpX=parseInt((obj.w-iw)/2)
			// 	vm.bgpY=0
			// 	console.log(vm.bgpX)
			// 	console.log(vm.bgpY)
			// }

			vm.isFullImg=true
		},
		playMe:function (event) {//播放歌曲
			if(!this.isErr){
				var audio=null,that=this,audioId='';
				if(event.target.nodeName=='IMG'){
					audio=event.target.parentNode.previousElementSibling;
					audioId=event.target.id
				}else{
					audio=event.target.previousElementSibling;
					audioId=event.target.firstElementChild.id
				}
				if(this.isPlay){//暂停
					audio.pause()
					this.isPlay=false
					obj.audioCurr='ad0'
				}else{//播放
					if(document.getElementById(obj.audioCurr)){//关掉上一个
						document.getElementById(obj.audioCurr).click()
					}
					audio.currentTime=0
					audio.play()
					this.isPlay=true
					obj.audioCurr=audioId
					audio.onended=function () {
						that.isPlay=false
					}
				}
			}
		},
		errAudio:function () {
			this.isErr=true
			this.isPlay=false
		}
	},
	computed:{
		vLength:function () {
			var second=this.audio_dur-0//获得当前秒数
				return (59-10)/66*second+10+'vw'
		},
		id:function () {
			return 'ad'+(++obj.audioNum)
		}
	},
	watch:{
		isPlay:function () {
			this.imgSrc=this.isPlay?'img/audio.gif':'img/audio.png'
		}
	}
})
Vue.component('right-top',{
	template:'#right-top-template',
	data:function () {
		return {
			openLiveRoom:true,//即时聊天是否打开
			isMove:false,//是否收拢
			isIconLeft:true,//箭头方向 true为left false为right
			liveRoomlists:obj.getMsg,//右上角即时消息
			views_num:obj.views
		}
	},
	methods: {
		openCR: function () {
			this.$parent.openChatRoom = !this.$parent.openChatRoom
		},
		toggleLR: function (event) {
			if (event.target.nodeName !== 'A') {
				if (this.openLiveRoom) {
					this.isMove = true
					this.isIconLeft = false
				} else {
					this.isMove = false
					this.isIconLeft = true
				}
				this.openLiveRoom = !this.openLiveRoom
			}
		},
		beforUpdate:{
			openLiveRoom:function () {
				if(obj.getMsg.length==0){
					console.log('openLiveRoom false')
					return false
				}
			},
			isMove:function () {
				if(obj.getMsg.length==0){
					console.log('isMove true')
					return true
				}
			}
		}
	}
})
Vue.component('right-bottom',{
	template:'#right-bottom-template',
	data:function () {
		return {
			showPanel:false
		}
	},
	methods:{
		toTop:function () {
			location.href='#top'
		},
		toBottom:function () {
			location.href='#bottom'
		},
		handle:function () {

				// this.showPanel=true
		},
		closePanel:function () {
			this.showPanel=false
		},
		shareRoom:function () {
			window.jz100.share()
		}
	}
})
Vue.component('anchor-send',{
	template:'#anchor-send-template',
	data:function () {
		return {
			isWrite:false,//主持人，主播 输入面板状态值
			writeMsg:''
		}
	},
	methods:{
		openWrite:function (event) {//打开文字输入面板
			this.isWrite=!this.isWrite
		},
		closeWrite:function () {
			this.isWrite=false
		},
		postMsg:function () {//发送文字信息
			var msg=this.writeMsg.trim()
			if(msg){
				var o={
					content:msg,
					msg_type:3,//1为语音，2为图片，3为主播发的文字，4为听众提问，5为用户讨论内容
					voice_duration:''
				}
				socket.emit('hostPost',o)
				this.isWrite=false
				this.writeMsg=''
				setTimeout(function () {
					location.href='#bottom'
				},100)
			}
		},
		record:function () {//录音
			this.isWrite=false
			window.jz100.record()
		},
		chooseImg:function () {
			this.isWrite=false
			//选择图片
			document.getElementById('anchorImg').click()
		},
		postImg:function (event) {//input发送图片
			var file=event.target.files[0];
			if(window.FileReader) {
				var fr = new FileReader();
				fr.onload = function (e) {
					var res=e.target.result,
						o = {
							content: res,
							msg_type: 2,//1为语音，2为图片，3为主播发的文字，4为听众提问，5为用户讨论内容
							voice_duration: ''
						}
					if(/^data:image\//.test(res)){
						var img=document.getElementById('anchorImg')
						img.type='text'
						img.type='file'
						socket.emit('hostPost',o)
						vm.$nextTick(function () {
							location.href='#bottom'
						})
					}else{
						alert('你选取的不是图片文件')
					}
				}
				fr.readAsDataURL(file);
			} else {
				alert("Not supported by your browser!");
			}
		}
	}

})
Vue.component('listener-send',{
	template:'#listener-send-template',
	data:function () {
		return {
			checked:false,
			ask_content:''
		}
	},
	methods:{
		postMsg:function () {//听众
			var msg=this.ask_content.trim();
			if(msg) {
				var o={
					content:msg,
					msg_type:this.checked?4:5,//4为听众提问，5为用户讨论内容
				};
				socket.emit('audiencePost',o);
				this.ask_content=''
				this.checked=false
			}else{
				console.log('消息为空');
			}
		}
	}
})
var vm = new Vue({
	el: '#anchor',
	data: {
		isIos:false,
		wHeight:'100vh',//屏幕高度
		showMain:true,
		user_type:1, //1为主持人 2为主播  3为听众
		openHistoryBtn:false,//是否显示查看 更多按钮
		toBottom:0,//加载更多时距离底部距离
		livingTime:'',//直播开始时间
		showLivingTime:false,
		countdown:{
			days:'00',
			hours:'00',
			minutes:'00',
			seconds:'00'
		},
		timer:null,//倒计时定时器开关
		openChatRoom:false,//聊天室开关
		liveRoomlists:obj.getMsg,//即时聊天室列表
		chatRoomLists:obj.hHistory,//聊天室列表
		items:[],//主播显示列表
		showItemsNum:0,//当index大于时显示
		stepShow:10,//展示的条数
		isFullImg:false,
		backgroundPosition:'50% 50%',
		backgroundImage:'',
		bgpX:0,
		bgpY:0,
		imgRatio:1,//全屏图的宽高比
		zoom:1,
		toPayWater:false,
		rewardName:'',//打赏人
		rewardUid:0,
		reward:null,//打赏金额
		disabled:true,//点击按钮状态
		rewardRes:{},//打赏结果
		hasResult:false,//是否有打赏结果
		waitingResult:false//是否等待打赏结果
	},
	methods:{
		openHistoryMsg:function () {//显示更多历史消息
			if(this.isIos){

			}else{
				var bh=document.getElementById('bottom').offsetTop,wh=document.body.scrollTop
				this.toBottom=bh-wh

				this.stepShow+=10

				this.$nextTick(function () {//下次dom渲染后执行的回调
					var bh=document.getElementById('bottom').offsetTop
					document.getElementById('bottom').scrollTop = bh-vm.toBottom
					window.pageYOffset =bh-vm.toBottom
					document.body.scrollTop=bh-vm.toBottom
				})
			}

		},
		back: function () {
			this.openChatRoom = false
		},
		giveReward: function (event) {//赏

			//重置状态
			this.rewardRes={}
			this.reward=null
			this.hasResult=false
			if(obj.timer){
				clearInterval(obj.timer)
				obj.timer=null
			}
			//打开面板
			this.toPayWater=true
			this.rewardName=event.target.getAttribute('username')
			this.rewardUid=event.target.getAttribute('uid')
		},
		closeFullImg: function (event) {
			this.isFullImg = false
		},
		stopScroll:function (event) {
			event.preventDefault();
		},
		payWater:function () {//支付
			if(this.reward!=null&&!this.waitingResult){
				var o={
					user_name:this.rewardName,//被打赏的人
					amount:this.reward,//打赏泉水额度
					rewardToUid:this.rewardUid
				}
				console.log('打赏')
				console.log(o)
				socket.emit('reward',o)
				this.waitingResult=true
			}
		},
		chooseWater:function (event) {//选择泉水额度
			event.target.parentNode.lastElementChild.value=''
			var value=parseInt(event.target.innerHTML)
			this.reward=value
		},
		closePay:function () {//关闭支付泉水页
			this.toPayWater=false
			//清除定时器
			if(obj.timer){
				clearInterval(obj.timer)
				obj.timer=null
			}
		},
		postRecord:function (d,p) {//录完音app调用上传函数 d:语音时长 p:路径
			var o={
					content:p,
					msg_type:1,//1为语音，2为图片，3为主播发的文字，4为听众提问，5为用户讨论内容
					voice_duration:d
				}
			socket.emit('hostPost',o)
		}
	},
	computed:{
		isIos:function () {
			if(navigator.userAgent.match(/jz100-APP-ios/i)){//此处是IOS设备
				return true
			}else{// 此处是安卓设备
				return false
			}
		},
		wHeight:function () {//.main的高
			return obj.h-40+'px'
		},
		showItemsNum:function () {
			return this.items.length-this.stepShow
		},
		openHistoryBtn:function () {
			return this.stepShow<this.items.length
		},
		total_num:function () {
			return this.chatRoomLists.length;
		},
		disabled:function () {
			return (this.reward==null||this.reward==0)?true:false
		}
	},
	watch:{
		reward:function (val) {
			if(this.reward){
				this.reward=Math.round(val)
			}
		},
		bgpX:function () {
			this.backgroundPosition=this.bgpX+'px '+this.bgpY+'px'
		},
		bgpY:function () {
			this.backgroundPosition=this.bgpX+'px '+this.bgpY+'px'
		}
	}
})
vm.user_type=user_type-0
