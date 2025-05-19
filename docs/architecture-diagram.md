flowchart TD
    %% Define main user entry point
    User([End User]) -->|Accesses| CloudFront

    %% Frontend infrastructure
    subgraph "Frontend Layer"
        CloudFront[CloudFront Distribution] -->|Origin| S3[S3 Website Bucket]
        S3 -->|Static Assets| ReactApp(React SPA)
        ReactApp -->|Features| ScenarioUI(Scenario Interface)
        ReactApp -->|Features| ChatUI(Chatbot Interface)
    end

    %% Authentication
    subgraph "Authentication Layer"
        CloudFront --> Cognito[Amazon Cognito]
        Cognito -->|JWT Token| CloudFront
        ReactApp -->|Auth Requests| Cognito
    end

    %% API Layer
    subgraph "API Layer"
        ReactApp -->|API Calls| ApiGateway[API Gateway]
        ApiGateway -->|Auth| Cognito
        ApiGateway -->|/scenarios| ScenarioAPI[Scenario Endpoints]
        ApiGateway -->|/learner-path| PathAPI[Learning Path Endpoints]
        ApiGateway -->|/responses| EvalAPI[Evaluation Endpoints]
        ApiGateway -->|/message| ChatAPI[Chatbot Endpoints]
    end

    %% Backend Lambda Functions
    subgraph "Compute Layer"
        ScenarioAPI --> ScenarioLambda[Scenario Manager λ]
        PathAPI --> PathLambda[Path Adapter λ]
        EvalAPI --> EvalLambda[Response Evaluator λ]
        ChatAPI --> ChatLambda[Bedrock Chat λ]
    end

    %% Data Layer
    subgraph "Data Layer"
        ScenarioTable[(Scenario\nDynamoDB)]
        ProgressTable[(Learner Progress\nDynamoDB)]
        
        ScenarioLambda <-->|CRUD| ScenarioTable
        ScenarioLambda <-->|Read/Write| ProgressTable
        PathLambda <-->|Read| ScenarioTable
        PathLambda <-->|Read/Write| ProgressTable
        EvalLambda <-->|Read| ScenarioTable
        EvalLambda <-->|Read/Write| ProgressTable
    end

    %% AI Services
    subgraph "AI Layer"
        Bedrock[Amazon Bedrock]
        EvalLambda -->|Scenario Evaluation| Bedrock
        ChatLambda -->|Agent Interactions| Bedrock
    end

    %% Styling
    classDef aws fill:#FF9900,stroke:#232F3E,color:#232F3E,stroke-width:2px;
    classDef frontend fill:#0D6EFD,stroke:#0A58CA,color:white,stroke-width:1px;
    classDef compute fill:#36C2B4,stroke:#2A9D8F,color:white,stroke-width:1px;
    classDef data fill:#4CAF50,stroke:#388E3C,color:white,stroke-width:1px;
    classDef auth fill:#9C27B0,stroke:#7B1FA2,color:white,stroke-width:1px;
    classDef user fill:#FFFFFF,stroke:#333333,color:#333333,stroke-width:1px;
    
    class CloudFront,S3,ApiGateway,Cognito,ScenarioTable,ProgressTable,Bedrock aws;
    class ReactApp,ScenarioUI,ChatUI frontend;
    class ScenarioLambda,PathLambda,EvalLambda,ChatLambda compute;
    class ScenarioTable,ProgressTable data;
    class Cognito auth;
    class User user;
