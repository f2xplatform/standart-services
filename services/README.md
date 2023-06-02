# Services

The file "services.ts" includes a description of abstract classes for microservices.
There are 3 abstract classes from which classes are extended for implementation:  

-THttpService --- for http request processing services  
-TCronService -- for scheduled services  
-TQueueService -- for queue processing services

When creating a new worker, first you need to extend the required class and pass the necessary properties:
-env -- enviroment accessing variables  
-name -- service name

and list the variable to hide in an maskArray.

After that, from this class, you need to create an instance (new Class) and call the function init().

Created class instance you need to save it to the "env" with "srv" property from which the following methods will be available.

### Common methods:

-getKVParam (get value from KV by key)  
-getKVParamWithMetadata (get value and metadata from KV by key)  
-setKVParam (write value to KV by key)  
-deleteKVParam (delete value from KV by key)  
-setDurableKVParam (write value to Durable Object by stub)  
-getDurableKVParam (get value from Durable Object by stub)  
-getDurableKVParamWithMetadata (get value and metadata from Durable Object by stub)  
-callService (calling and answering on bound microservices)  
-callHttp (calling and answering external request)  
-sendQueue (send to queue)

### THttpService methods:

-generateResponseError (to generate response with error)  
-generateResponseOK (to generate response with error)  

### TCronService methods:

-traceCronStop (for sending message about cron stop to the q_trace)  

### TQueueService methods:

-traceQueueStop (for sending message about cron stop to the q_trace)  
-handleQMessage(queue message handler)  

There are 2 queues:

- trace-queue (q_trace)
- access-queue (q_access)

In all classes if the value of variable "trace" is true, the requests and responses are sent to the "trace-queue".
Format : {
id: generated string,
trace: number(1:0),
message: string (formed request/response message)
}

Id and trace can be sent in headers and checked for presence. If these properties are not in the headers, new ones are generated (id - randomly, trace - from env). If there is a trace in the header - compare the trace from the header and the trace from env and take into account the greater value.

All requests are sent to the access-queue unconditionally.

### TDurableKV methods:

-fetch (to communicate with a Durable Object)  
-alarm (to perform an action when an alarm occurs)  

To access an Durable Object call methods setDurableKVParam, getDurableKVParam, getDurableKVParamWithMetadata. The "stub" parameter of these methods is obtained as follows:  
let id = env.$durableObjectBinding$.idFromName($key$);  
let stub = env.$durableObjectBinding$.get(id);  