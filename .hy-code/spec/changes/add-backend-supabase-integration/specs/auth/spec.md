## ADDED Requirements

### Requirement: 家长注册

系统 SHALL 允许家长通过用户名和密码创建新账户，同时录入至少一个孩子的基本信息。

#### Scenario: 注册成功
- **WHEN** 家长提交有效的用户名、密码和至少一个孩子信息
- **THEN** 系统创建家长账户和孩子记录，返回 JWT token 和用户信息

#### Scenario: 用户名已存在
- **WHEN** 家长提交的用户名已被其他账户使用
- **THEN** 系统返回 409 错误，提示"用户名已存在"

#### Scenario: 密码强度不足
- **WHEN** 家长提交的密码少于 6 个字符
- **THEN** 系统返回 400 错误，提示密码要求

### Requirement: 家长登录

系统 SHALL 允许家长通过用户名/手机号和密码登录，获取 JWT 访问令牌。

#### Scenario: 登录成功
- **WHEN** 家长提交正确的用户名和密码
- **THEN** 系统返回有效的 JWT token（有效期 7 天）和用户基本信息

#### Scenario: 凭证错误
- **WHEN** 家长提交错误的用户名或密码
- **THEN** 系统返回 401 错误，提示"用户名或密码错误"

#### Scenario: 账户不存在
- **WHEN** 家长提交的用户名在系统中不存在
- **THEN** 系统返回 401 错误（不区分是用户名还是密码错误，防止枚举攻击）

### Requirement: JWT 认证保护

系统 SHALL 对所有非公开 API 端点进行 JWT token 验证，拒绝未授权请求。

#### Scenario: 有效 token 访问
- **WHEN** 请求携带有效的 Bearer JWT token
- **THEN** 系统解析 token，将用户信息注入请求上下文，继续处理请求

#### Scenario: 无效或过期 token
- **WHEN** 请求携带无效或已过期的 JWT token
- **THEN** 系统返回 401 错误，前端跳转到登录页

#### Scenario: 缺少 token
- **WHEN** 请求未携带 Authorization 头
- **THEN** 系统返回 401 错误

### Requirement: 获取当前用户信息

系统 SHALL 提供接口让已登录家长获取自己的账户信息和孩子列表。

#### Scenario: 获取用户信息成功
- **WHEN** 已登录家长请求 GET /api/v1/auth/me
- **THEN** 系统返回家长基本信息（不含密码）和关联的孩子列表