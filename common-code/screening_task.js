_record_type="s2";
var _task_fields='';
//-------------------------------------
//var participant_pid=$vm.module_list['participant'].table_id;
//var notes_pid=$vm.module_list['notes'].table_id;
/*
var participant_pid;
var notes_pid;
if($vm.module_list['participant']!==undefined) participant_pid=$vm.module_list['participant'].table_id;
if($vm.module_list['notes']!==undefined) notes_pid=$vm.module_list['notes'].table_id;
if(_module.var!==undefined){
    participant_pid=_module.var.participant;
    notes_pid=_module.var.notes;
}
*/
//var participant_pid=_module.var.participant;
//var notes_pid=_module.var.notes;
//var site_filter_pid=_module.var.site_filter;
var participant_pid=$vm.module_list[_app_id+'participant'].table_id;
var notes_pid=$vm.module_list[_app_id+'notes'].table_id;
var site_filter_pid=$vm.module_list[_app_id+'site_filter'].table_id;
//-------------------------------------
var site_sql_where='';
var site_array=[];
var site_filter_and_request=function(){
    var site_filter_pid=$vm.module_list['site_filter'].table_id;
    var sql="select List=@('Site_List') from [FORM-"+site_filter_pid+"] where S2=@S1";
    var req_data={cmd:'query_records',sql:sql,s1:$vm.user};
    $VmAPI.request({data:req_data,callback:function(res){
        if(res.records.length>0){
            var sites=res.records[0].List.replace(/\r/g,'\n').replace(/\n\n/g,'\n').replace(/\n/g,',');
            sites=sites.replace(',*','');
            sites=sites.replace('*','');
            site_array=sites.split(',');
            var sites="";
            for(var i=0;i<site_array.length;i++){
                if(sites!=="") sites+=",";
                sites+="'"+site_array[i]+"'";
            }
            if(res.records[0].List.indexOf('*')!==-1) site_sql_where='';
            else site_sql_where=" where S1 in ("+sites+")";
        }
        else{
            site_sql_where=" where S1 in ('')";
        }
        _set_req(); _request_data();
    }});
}
//-------------------------------------
_set_req=function(){
    if($vm.online_questionnaire===1){
        _records=[];
        return;
    }
    var participant_where="";
    var participant_uid=$vm.vm['__ID'].op.participant_uid;
    if(participant_uid!==undefined){
        site_sql_where='';
        participant_where=" where uid="+participant_uid;
    }

    var sql="with notes as (select PUID,NT=S1,NC=@('Color'),NRowNum=row_number() over (PARTITION BY PUID order by ID DESC) from [FORM-"+notes_pid+"] where ppid="+_db_pid+")";
    sql+=",participant as (select Site=S1,ParticipantUID=UID from [FORM-"+participant_pid+"]"+site_sql_where+participant_where+" )";
    sql+=",task as (select ID,UID,PUID,S3,Site=participant.Site,Information,DateTime,Author,RowNum=row_number() over (order by ID DESC) from [FORM-"+_db_pid+"-@S1] join participant on PUID=ParticipantUID)";
    sql+="select ID,S3,UID,Site,Information,DateTime,Author,NT,NC,dirty=0, valid=1 from task left join notes on UID=notes.PUID and NRowNum=1 where RowNum between @I6 and @I7";
    var sql_n="with participant as (select Site=S1,ParticipantUID=UID from [FORM-"+participant_pid+"]"+site_sql_where+" )";
    sql_n+=" select count(ID) from [FORM-"+_db_pid+"-@S1] join participant on PUID=ParticipantUID";
    _req={cmd:'query_records',sql:sql,sql_n:sql_n,s1:'"'+$('#keyword__ID').val()+'"',I:$('#I__ID').text(),page_size:$('#page_size__ID').val()}
}
//-------------------------------------
_set_req_export=function(){
    _fields_e="Participant ID|ParticipantUID,Participant|ParticipantName,"+_task_fields
    var sql="with participant as (select Site=S1,ParticipantUID=UID,ParticipantName=@('Subject_Initials')+' '+@('Gender')+' '+@('DOB'),RowNum=row_number() over (order by ID DESC) from [FORM-"+participant_pid+"]"+site_sql_where+" )";
    sql+=",task as (select ID,UID,PUID,S3,Information,DateTime,Author from [FORM-"+_db_pid+"-@S1])";
    sql+=" select ID,ParticipantUID,ParticipantName,Site,Information,DateTime,Author from participant left join task on PUID=ParticipantUID";
    _set_from_to();
    if(_from!='0' && _to!='0') sql+=" where RowNum between @I6 and @I7";
    _req={cmd:'query_records',sql:sql,i6:_from,i7:_to}
}
//-------------------------------------
var _default_cell_render=function(records,I,field,td,set_value,source){
    switch(field){
        case 'Participant':
            td.autocomplete({
                minLength:0,
                source:function(request,response){
                    var sql="with tb as (select name=@('Registration_ID'),value2=UID,value3=S1 from [FORM-"+participant_pid+"])";
                    sql+=" select top 10 name,value=name,value2,value3 from tb where Name like '%'+@S1+'%' ";
                    $VmAPI.request({data:{cmd:'auto',s1:request.term,sql:sql,minLength:0},callback:function(res){
                        response($vm.autocomplete_list(res.table));
                    }});
                },
                select: function(event,ui){
                    records[I]['Participant_uid']=ui.item.value2;
                }
            })
            td.focus(function(){td.autocomplete("search","");});
            break;
        case 'Site':
                records[I].vm_custom[field]=true;
                break;
        case 'S3':
            records[I].vm_custom[field]=true;
            td.html("<span style='color:"+records[I][field]+"'>&#x25cf;</span>");
            break;
        case 'NT':
            records[I].vm_custom[field]=true;
            if(_records[I].UID===undefined) return;
            var color=_records[I].NC;     if(color==="") color="#000000"
            var value=records[I][field];  if(value==="") value='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
            td.html("<u style='cursor:pointer;color:"+color+"'>"+value+"</u>");
            td.find('u').on('click',function(){
                //var task_name=$vm.module_list[$vm.vm['__ID'].name][3];
                var visit_task=$vm.module_list[$vm.vm['__ID'].name].notes;
                //$vm.load_module_by_name(_module.var.notes_module,$vm.root_layout_content_slot,{
                $vm.load_module_by_name(_app_id+'notes',$vm.root_layout_content_slot,{
                    task_record_uid:_records[I].UID,
                    task_record_pid:_db_pid,
                    //task_name:task_name,
                    Visit_Task:visit_task,
                    Participant:_records[I].Participant,
                    Participant_uid:_records[I].Participant_uid,
                    sql_where:" PPID="+_db_pid+ "and PUID="+_records[I].UID,
                });
            });
            break;
    }
}
//-------------------------------------
var _set_status_and_participant=function(record,dbv){    //set status color, PUID=paticipant_uid
    var flds=_task_fields.split(',');
    var J=0,K=0,N=flds.length;
    for(var i=0;i<N;i++){
        var id=flds[i].split('|').pop();
        if(id=='UID') K++;
        else if(record[id]==='' || record[id]===undefined || record[id]===null)  J++;
    }
    N=N-K;
    if(N==J) 		    dbv.S3='#FF0000';
    else if(J===0)  	dbv.S3='#00FF00';
    else 			    dbv.S3='#FFCC00';
    if(record.Participant===undefined || record.Participant===null || record.Participant==""){
        $vm.alert("No participant was selected");
        return false;
    }
    dbv.PPID=participant_pid;
    if(record.Participant_uid!==undefined) dbv.PUID=record.Participant_uid;
    return true;
};
//-------------------------------------
_new_pre_data_process=function(){
    if($vm.vm['__ID'].op.participant_uid!==undefined) _records[0].Participant_uid=$vm.vm['__ID'].op.participant_uid;
    if($vm.vm['__ID'].op.participant_name!==undefined) _records[0].Participant=$vm.vm['__ID'].op.participant_name;
}
//-------------------------------------
