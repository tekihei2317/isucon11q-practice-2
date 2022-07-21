alter table isu_condition add column condition_level varchar(32) default 'warning';
update isu_condition set condition_level = 'info' where `condition` = 'is_dirty=false,is_overweight=false,is_broken=false';
update isu_condition set condition_level = 'critical' where `condition` = 'is_dirty=true,is_overweight=true,is_broken=true';
