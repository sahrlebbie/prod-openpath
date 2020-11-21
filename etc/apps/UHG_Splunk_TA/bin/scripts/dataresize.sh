
#This script was written to find out the size of the data bundle in splunk and to  see if it's increasing.
#Splunk doesn't handle large lookup bundles so it's best to track the size of the lookups.

#Lookup Editor Lookups
UHG_LOOKUPS="/opt/splunk/etc/apps/UHG_Splunk_TA/lookups"
OLD_LOOKUP_SIZE_FILE="/opt/splunk/etc/apps/UHG_Splunk_TA/lookups/lookupfilesize.csv"

if [ ! -d  $UHG_LOOKUPS ]; then
    echo "Directory not found, creating directory"
        mkdir $UHG_LOOKUPS
fi

if [ ! -f $OLD_LOOKUP_SIZE_FILE ]; then
    echo "File not found, creating file"
	touch $OLD_LOOKUP_SIZE_FILE
	#Create Headers
	echo "size,month,day,time,file" > $OLD_LOOKUP_SIZE_FILE
	#Now we are going to append the size of these lookups in a file that we will monitor in a CSV separated format.
	find /opt/splunk/etc/apps -type f -iname "*.csv" -exec ls -l {} \; |awk '{print $5,$6,$7,$8,$9}' >> $OLD_LOOKUP_SIZE_FILE
fi

#Now we are going to append the size of these lookups in a file that we will monitor in a CSV separated format.
find /opt/splunk/etc/apps -type f -iname "*.csv" -exec ls -l {} \; |awk '{print $5,$6,$7,$8,$9}' >> $OLD_LOOKUP_SIZE_FILE

OLD_LOOKUP_SIZE_FILE_SIZE=$(du $OLD_LOOKUP_SIZE_FILE |awk '{print $1}')
THRESHOLD_SIZE=10000000
if [ "$OLD_LOOKUP_SIZE_FILE_SIZE" -ge "$THRESHOLD_SIZE" ]
then
  sleep 10s
  curl -k -u admin:Splunk18! https://localhost:8089/services/messages -d severity="critical" -d name=message -d value="This lookup size is becoming bigger than we desire, let's consider killing this"
else
  curl -k -u admin:Splunk18! https://localhost:8089/services/messages -d severity="warn" -d name=message -d value="The script file size is not currently large enough to warrant concern."
fi

#Replacing WHITESPACE with comma values
sed -i 's/\s/,/g' $OLD_LOOKUP_SIZE_FILE
