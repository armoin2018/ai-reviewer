---
applyTo: "**/*.go"
---

# Go Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for Go development. These include AI linting hints to automatically enforce Go idioms and maintain clean, performant, and idiomatic Go code.

⸻

📂 Project Architecture

✅ Rule: Follow Go project layout

- Use standard Go project structure (`cmd/`, `pkg/`, `internal/`)
- Keep packages focused and cohesive
- Use meaningful package names
- Implement proper module organization

✅ Rule: Go idioms

- Use short variable names in small scopes
- Prefer composition over inheritance
- Handle errors explicitly
- Use goroutines and channels for concurrency

✅ Rule: Interface design

- Keep interfaces small and focused
- Define interfaces at point of use
- Use standard library interfaces when possible
- Implement implicit interface satisfaction

✅ Rule: Error handling

- Return errors as the last return value
- Use custom error types when appropriate
- Wrap errors for context
- Handle all error cases explicitly

⸻

📜 Go Standards & Libraries

✅ Rule: Use standard library

- `fmt` for formatted I/O
- `context` for request-scoped values and cancellation
- `time` for time operations
- `encoding/json` for JSON handling
- `net/http` for HTTP operations

✅ Rule: Naming conventions

- Packages: `lowercase` (e.g., `user`, `orderservice`)
- Variables/Functions: `camelCase` for private, `PascalCase` for public
- Constants: `PascalCase` or `camelCase` depending on visibility
- Interfaces: `PascalCase` ending with `-er` when possible (e.g., `Reader`, `Writer`)

⸻

🖋 Go Coding Standards

✅ Package Organization

- Use meaningful package names
- Keep packages cohesive and focused
- Minimize package dependencies
- Use internal packages for private code

✅ Example:

```go
// Package user provides user management functionality
package user

import (
    "context"
    "fmt"
    "time"
    
    "example.com/project/internal/database"
    "example.com/project/pkg/validation"
)

// User represents a user in the system
type User struct {
    ID        int64     `json:"id"`
    Username  string    `json:"username"`
    Email     string    `json:"email"`
    Status    Status    `json:"status"`
    CreatedAt time.Time `json:"created_at"`
}

// Status represents the user status
type Status string

const (
    StatusActive    Status = "active"
    StatusInactive  Status = "inactive" 
    StatusSuspended Status = "suspended"
)

// Service provides user management operations
type Service struct {
    db        database.DB
    validator validation.Validator
}

// NewService creates a new user service
func NewService(db database.DB, validator validation.Validator) *Service {
    return &Service{
        db:        db,
        validator: validator,
    }
}
```

⸻

✅ Function Design

- Keep functions focused and small
- Use meaningful parameter and return names
- Handle errors explicitly
- Use context for cancellation and timeouts

✅ Example:

```go
// CreateUser creates a new user with validation
func (s *Service) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    if err := s.validator.Validate(req); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }
    
    // Check if user already exists
    existing, err := s.db.GetUserByUsername(ctx, req.Username)
    if err != nil && !database.IsNotFound(err) {
        return nil, fmt.Errorf("failed to check existing user: %w", err)
    }
    if existing != nil {
        return nil, ErrUserAlreadyExists
    }
    
    user := &User{
        Username:  req.Username,
        Email:     req.Email,
        Status:    StatusActive,
        CreatedAt: time.Now(),
    }
    
    if err := s.db.CreateUser(ctx, user); err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }
    
    return user, nil
}

// CreateUserRequest represents the data needed to create a user
type CreateUserRequest struct {
    Username string `json:"username" validate:"required,min=3,max=50"`
    Email    string `json:"email" validate:"required,email"`
}

// GetUserByID retrieves a user by ID
func (s *Service) GetUserByID(ctx context.Context, id int64) (*User, error) {
    if id <= 0 {
        return nil, ErrInvalidUserID
    }
    
    user, err := s.db.GetUserByID(ctx, id)
    if err != nil {
        if database.IsNotFound(err) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return user, nil
}
```

⸻

✅ Error Handling

- Define custom error types
- Use error wrapping for context
- Implement error interfaces appropriately
- Handle all error cases

✅ Example:

```go
import (
    "errors"
    "fmt"
)

// Custom error types
var (
    ErrUserNotFound       = errors.New("user not found")
    ErrUserAlreadyExists  = errors.New("user already exists")
    ErrInvalidUserID      = errors.New("invalid user ID")
    ErrInvalidCredentials = errors.New("invalid credentials")
)

// UserError represents a user-specific error with details
type UserError struct {
    Code    string
    Message string
    UserID  int64
    Err     error
}

func (e *UserError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("user error [%s]: %s (user_id: %d): %v", 
                          e.Code, e.Message, e.UserID, e.Err)
    }
    return fmt.Sprintf("user error [%s]: %s (user_id: %d)", 
                      e.Code, e.Message, e.UserID)
}

func (e *UserError) Unwrap() error {
    return e.Err
}

// NewUserError creates a new user error
func NewUserError(code, message string, userID int64, err error) *UserError {
    return &UserError{
        Code:    code,
        Message: message,
        UserID:  userID,
        Err:     err,
    }
}

// Example usage in service method
func (s *Service) UpdateUser(ctx context.Context, id int64, req UpdateUserRequest) (*User, error) {
    user, err := s.GetUserByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("failed to get user for update: %w", err)
    }
    
    if req.Email != "" {
        if !s.validator.IsValidEmail(req.Email) {
            return nil, NewUserError("INVALID_EMAIL", "email format is invalid", id, nil)
        }
        user.Email = req.Email
    }
    
    if req.Status != "" {
        if !isValidStatus(req.Status) {
            return nil, NewUserError("INVALID_STATUS", "status is not valid", id, nil)
        }
        user.Status = Status(req.Status)
    }
    
    if err := s.db.UpdateUser(ctx, user); err != nil {
        return nil, NewUserError("UPDATE_FAILED", "failed to update user", id, err)
    }
    
    return user, nil
}

type UpdateUserRequest struct {
    Email  string `json:"email,omitempty"`
    Status string `json:"status,omitempty"`
}

func isValidStatus(status string) bool {
    switch Status(status) {
    case StatusActive, StatusInactive, StatusSuspended:
        return true
    default:
        return false
    }
}
```

⸻

✅ Interface Design

- Keep interfaces small and focused
- Define interfaces where they're used
- Use composition for complex behavior
- Implement standard interfaces when appropriate

✅ Example:

```go
// Repository interface for user data access
type Repository interface {
    CreateUser(ctx context.Context, user *User) error
    GetUserByID(ctx context.Context, id int64) (*User, error)
    GetUserByUsername(ctx context.Context, username string) (*User, error)
    UpdateUser(ctx context.Context, user *User) error
    DeleteUser(ctx context.Context, id int64) error
    ListUsers(ctx context.Context, filters ListFilters) ([]*User, error)
}

// Validator interface for user validation
type Validator interface {
    ValidateUser(user *User) error
    IsValidEmail(email string) bool
    IsValidUsername(username string) bool
}

// ListFilters for filtering user lists
type ListFilters struct {
    Status Status
    Limit  int
    Offset int
}

// Example implementation
type postgresRepository struct {
    db *sql.DB
}

func NewPostgresRepository(db *sql.DB) Repository {
    return &postgresRepository{db: db}
}

func (r *postgresRepository) CreateUser(ctx context.Context, user *User) error {
    query := `
        INSERT INTO users (username, email, status, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id`
    
    err := r.db.QueryRowContext(ctx, query, 
        user.Username, user.Email, user.Status, user.CreatedAt).Scan(&user.ID)
    if err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }
    
    return nil
}

func (r *postgresRepository) GetUserByID(ctx context.Context, id int64) (*User, error) {
    query := `
        SELECT id, username, email, status, created_at
        FROM users
        WHERE id = $1`
    
    user := &User{}
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID, &user.Username, &user.Email, &user.Status, &user.CreatedAt)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return user, nil
}
```

⸻

✅ Concurrency

- Use goroutines for concurrent operations
- Use channels for communication
- Implement proper synchronization
- Handle context cancellation

✅ Example:

```go
import (
    "context"
    "sync"
    "time"
)

// ProcessUsers processes users concurrently
func (s *Service) ProcessUsers(ctx context.Context, userIDs []int64, workers int) ([]ProcessResult, error) {
    if len(userIDs) == 0 {
        return nil, nil
    }
    
    // Channel for user IDs to process
    userChan := make(chan int64, len(userIDs))
    
    // Channel for results
    resultChan := make(chan ProcessResult, len(userIDs))
    
    // Start workers
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go s.processWorker(ctx, &wg, userChan, resultChan)
    }
    
    // Send user IDs to workers
    go func() {
        defer close(userChan)
        for _, id := range userIDs {
            select {
            case userChan <- id:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // Wait for workers to complete
    go func() {
        wg.Wait()
        close(resultChan)
    }()
    
    // Collect results
    var results []ProcessResult
    for result := range resultChan {
        results = append(results, result)
    }
    
    return results, ctx.Err()
}

func (s *Service) processWorker(ctx context.Context, wg *sync.WaitGroup, userChan <-chan int64, resultChan chan<- ProcessResult) {
    defer wg.Done()
    
    for {
        select {
        case userID, ok := <-userChan:
            if !ok {
                return
            }
            
            result := s.processUser(ctx, userID)
            
            select {
            case resultChan <- result:
            case <-ctx.Done():
                return
            }
            
        case <-ctx.Done():
            return
        }
    }
}

func (s *Service) processUser(ctx context.Context, userID int64) ProcessResult {
    // Add timeout for individual user processing
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    user, err := s.GetUserByID(ctx, userID)
    if err != nil {
        return ProcessResult{
            UserID:  userID,
            Success: false,
            Error:   err,
        }
    }
    
    // Simulate processing
    select {
    case <-time.After(100 * time.Millisecond):
        // Processing completed
    case <-ctx.Done():
        return ProcessResult{
            UserID:  userID,
            Success: false,
            Error:   ctx.Err(),
        }
    }
    
    return ProcessResult{
        UserID:  userID,
        User:    user,
        Success: true,
    }
}

type ProcessResult struct {
    UserID  int64
    User    *User
    Success bool
    Error   error
}
```

⸻

✅ HTTP Handlers

- Use standard library patterns
- Implement proper middleware
- Handle content types appropriately
- Use context for request-scoped data

✅ Example:

```go
import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"
    
    "github.com/gorilla/mux"
)

// Handler provides HTTP handlers for user operations
type Handler struct {
    service *Service
    logger  Logger
}

// NewHandler creates a new user handler
func NewHandler(service *Service, logger Logger) *Handler {
    return &Handler{
        service: service,
        logger:  logger,
    }
}

// CreateUser handles POST /users
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.respondError(w, http.StatusBadRequest, "invalid request body", err)
        return
    }
    
    user, err := h.service.CreateUser(r.Context(), req)
    if err != nil {
        switch {
        case errors.Is(err, ErrUserAlreadyExists):
            h.respondError(w, http.StatusConflict, "user already exists", err)
        default:
            h.logger.Error("failed to create user", "error", err)
            h.respondError(w, http.StatusInternalServerError, "failed to create user", nil)
        }
        return
    }
    
    h.respondJSON(w, http.StatusCreated, user)
}

// GetUser handles GET /users/{id}
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        h.respondError(w, http.StatusBadRequest, "invalid user ID", err)
        return
    }
    
    user, err := h.service.GetUserByID(r.Context(), id)
    if err != nil {
        switch {
        case errors.Is(err, ErrUserNotFound):
            h.respondError(w, http.StatusNotFound, "user not found", nil)
        default:
            h.logger.Error("failed to get user", "user_id", id, "error", err)
            h.respondError(w, http.StatusInternalServerError, "failed to get user", nil)
        }
        return
    }
    
    h.respondJSON(w, http.StatusOK, user)
}

func (h *Handler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    
    if err := json.NewEncoder(w).Encode(data); err != nil {
        h.logger.Error("failed to encode response", "error", err)
    }
}

func (h *Handler) respondError(w http.ResponseWriter, status int, message string, err error) {
    response := ErrorResponse{
        Error:   message,
        Status:  status,
    }
    
    if err != nil {
        h.logger.Error(message, "error", err)
    }
    
    h.respondJSON(w, status, response)
}

type ErrorResponse struct {
    Error  string `json:"error"`
    Status int    `json:"status"`
}

// Logger interface for structured logging
type Logger interface {
    Error(msg string, keysAndValues ...interface{})
    Info(msg string, keysAndValues ...interface{})
    Debug(msg string, keysAndValues ...interface{})
}
```

⸻

🧪 Go Testing

✅ Unit Testing

- Use table-driven tests
- Test error cases
- Use testify for assertions
- Mock dependencies appropriately

✅ Example:

```go
func TestService_CreateUser(t *testing.T) {
    tests := []struct {
        name          string
        req           CreateUserRequest
        mockSetup     func(*mockRepository, *mockValidator)
        expectedUser  *User
        expectedError error
    }{
        {
            name: "successful user creation",
            req: CreateUserRequest{
                Username: "testuser",
                Email:    "test@example.com",
            },
            mockSetup: func(repo *mockRepository, validator *mockValidator) {
                validator.On("Validate", mock.Anything).Return(nil)
                repo.On("GetUserByUsername", mock.Anything, "testuser").Return(nil, database.ErrNotFound)
                repo.On("CreateUser", mock.Anything, mock.AnythingOfType("*user.User")).Return(nil)
            },
            expectedUser: &User{
                Username: "testuser",
                Email:    "test@example.com",
                Status:   StatusActive,
            },
            expectedError: nil,
        },
        {
            name: "user already exists",
            req: CreateUserRequest{
                Username: "existinguser",
                Email:    "existing@example.com",
            },
            mockSetup: func(repo *mockRepository, validator *mockValidator) {
                validator.On("Validate", mock.Anything).Return(nil)
                repo.On("GetUserByUsername", mock.Anything, "existinguser").Return(&User{}, nil)
            },
            expectedUser:  nil,
            expectedError: ErrUserAlreadyExists,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup
            mockRepo := &mockRepository{}
            mockValidator := &mockValidator{}
            service := NewService(mockRepo, mockValidator)
            
            tt.mockSetup(mockRepo, mockValidator)
            
            // Execute
            user, err := service.CreateUser(context.Background(), tt.req)
            
            // Assert
            if tt.expectedError != nil {
                assert.Error(t, err)
                assert.True(t, errors.Is(err, tt.expectedError))
                assert.Nil(t, user)
            } else {
                assert.NoError(t, err)
                assert.NotNil(t, user)
                assert.Equal(t, tt.expectedUser.Username, user.Username)
                assert.Equal(t, tt.expectedUser.Email, user.Email)
                assert.Equal(t, tt.expectedUser.Status, user.Status)
            }
            
            // Verify mocks
            mockRepo.AssertExpectations(t)
            mockValidator.AssertExpectations(t)
        })
    }
}
```

⸻

🚦 Go AI Enforcement Summary

✅ Enforce gofmt formatting
✅ Require explicit error handling (no ignored errors)
✅ Block naked returns in functions > 5 lines
✅ Enforce interface usage at point of consumption
✅ Require context.Context as first parameter in functions
✅ Block direct access to package variables (use functions)
✅ Enforce proper channel usage and closure
✅ Require proper goroutine cleanup
✅ Enforce standard library usage over third-party when possible
✅ Auto-fix violations where possible
