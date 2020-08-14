### How to control search refresh
The search refresh behaviour can be controlled by following options

#####```refresh = <integer>|<relative-time-expression>```

* The amount of time between refreshes
* If an integer value is specified, then it is treated as seconds
* Otherwise it's a relative time expression corresponding to the search language (eg, 1h5m or 5s)
* Default is to not refresh the element
    
#####```refreshType = [delay|interval]```

* Defines the point from which the refresh time is counted. 
* "delay" means to start counting down when the search is done.
* "interval" means we start counting when the search is dispatched. If the runtime of the search is longer than the configured time, then the job is cancelled and a new one is dispatched.
* default is "delay"


### How to control refresh display

#####```<option name="refresh.display">none|preview|progressbar</option>```

* "preview" means shows loading message and progress bar 
* "progressbar" (the new default) means only shows progress bar while the search refreshes, no loading message 
* "none" means show no progress bar or loading message while the search is reloading