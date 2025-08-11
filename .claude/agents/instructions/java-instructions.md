---
applyTo: "**/*.java"
---

# Java Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for Java development. These include AI linting hints to automatically enforce Java coding standards and maintain clean, performant, and maintainable Java code.

⸻

📂 Project Architecture

✅ Rule: Enforce object-oriented design

- Use proper encapsulation with private fields and public methods
- Implement inheritance and polymorphism appropriately
- Follow SOLID principles
- Use design patterns where appropriate

✅ Rule: Package organization

- Use reverse domain naming for packages (e.g., `com.company.project.module`)
- Organize classes by functionality, not type
- Keep package dependencies minimal and acyclic
- Use package-private visibility when appropriate

✅ Rule: Modern Java practices

- Use Java 8+ features (streams, lambdas, Optional)
- Implement proper exception handling
- Use immutable objects where possible
- Leverage Java Collections framework

✅ Rule: Memory management

- Use try-with-resources for resource management
- Avoid memory leaks with proper collection usage
- Implement proper equals() and hashCode() methods
- Use appropriate collection types for performance

⸻

📜 Java Standards & Libraries

✅ Rule: Use standard Java libraries

- `java.util` for collections and utilities
- `java.time` for date/time operations (avoid Date/Calendar)
- `java.nio` for file operations
- `java.util.concurrent` for threading

✅ Rule: Naming conventions

- Classes: `PascalCase` (e.g., `UserManager`, `OrderProcessor`)
- Methods: `camelCase` (e.g., `processOrder`, `getUserById`)
- Variables: `camelCase` (e.g., `userName`, `orderCount`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- Packages: `lowercase.with.dots` (e.g., `com.example.service.user`)

⸻

🖋 Java Coding Standards

✅ Class Design

- Use proper access modifiers
- Implement immutable classes when possible
- Override equals(), hashCode(), and toString() appropriately
- Use builder pattern for complex objects

✅ Example:

```java
public final class User {
    private final long id;
    private final String username;
    private final String email;
    private final UserStatus status;
    private final LocalDateTime createdAt;
    
    private User(Builder builder) {
        this.id = builder.id;
        this.username = Objects.requireNonNull(builder.username, "Username cannot be null");
        this.email = Objects.requireNonNull(builder.email, "Email cannot be null");
        this.status = Objects.requireNonNull(builder.status, "Status cannot be null");
        this.createdAt = Objects.requireNonNull(builder.createdAt, "Created date cannot be null");
    }
    
    // Getters
    public long getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public UserStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        User user = (User) obj;
        return id == user.id &&
               Objects.equals(username, user.username) &&
               Objects.equals(email, user.email);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(id, username, email);
    }
    
    @Override
    public String toString() {
        return String.format("User{id=%d, username='%s', email='%s', status=%s}", 
                           id, username, email, status);
    }
    
    // Builder pattern
    public static class Builder {
        private long id;
        private String username;
        private String email;
        private UserStatus status = UserStatus.ACTIVE;
        private LocalDateTime createdAt = LocalDateTime.now();
        
        public Builder setId(long id) {
            this.id = id;
            return this;
        }
        
        public Builder setUsername(String username) {
            this.username = username;
            return this;
        }
        
        public Builder setEmail(String email) {
            this.email = email;
            return this;
        }
        
        public Builder setStatus(UserStatus status) {
            this.status = status;
            return this;
        }
        
        public Builder setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public User build() {
            return new User(this);
        }
    }
}

public enum UserStatus {
    ACTIVE, INACTIVE, SUSPENDED
}
```

⸻

✅ Method Design

- Keep methods focused and single-purpose
- Use appropriate parameter types and return types
- Implement proper validation
- Use Optional for nullable returns

✅ Example:

```java
public class UserService {
    private final UserRepository userRepository;
    private final EmailValidator emailValidator;
    
    public UserService(UserRepository userRepository, EmailValidator emailValidator) {
        this.userRepository = Objects.requireNonNull(userRepository);
        this.emailValidator = Objects.requireNonNull(emailValidator);
    }
    
    public Optional<User> findUserById(long userId) {
        if (userId <= 0) {
            return Optional.empty();
        }
        
        return userRepository.findById(userId);
    }
    
    public User createUser(String username, String email) {
        validateUsername(username);
        validateEmail(email);
        
        if (userRepository.existsByUsername(username)) {
            throw new UserAlreadyExistsException("Username already exists: " + username);
        }
        
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("Email already exists: " + email);
        }
        
        User user = new User.Builder()
                .setUsername(username)
                .setEmail(email)
                .setStatus(UserStatus.ACTIVE)
                .build();
                
        return userRepository.save(user);
    }
    
    public List<User> findActiveUsers() {
        return userRepository.findByStatus(UserStatus.ACTIVE)
                .stream()
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }
    
    private void validateUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be null or empty");
        }
        
        if (username.length() < 3 || username.length() > 50) {
            throw new IllegalArgumentException("Username must be between 3 and 50 characters");
        }
    }
    
    private void validateEmail(String email) {
        if (email == null || !emailValidator.isValid(email)) {
            throw new IllegalArgumentException("Invalid email address: " + email);
        }
    }
}
```

⸻

✅ Exception Handling

- Use specific exception types
- Implement proper exception hierarchy
- Use try-with-resources for resource management
- Log exceptions appropriately

✅ Example:

```java
// Custom exception hierarchy
public class UserServiceException extends Exception {
    public UserServiceException(String message) {
        super(message);
    }
    
    public UserServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class UserAlreadyExistsException extends UserServiceException {
    public UserAlreadyExistsException(String message) {
        super(message);
    }
}

public class UserNotFoundException extends UserServiceException {
    public UserNotFoundException(String message) {
        super(message);
    }
}

// Service with proper exception handling
public class FileUserService {
    private static final Logger logger = LoggerFactory.getLogger(FileUserService.class);
    private final Path userDataPath;
    
    public FileUserService(Path userDataPath) {
        this.userDataPath = Objects.requireNonNull(userDataPath);
    }
    
    public List<User> loadUsersFromFile() throws UserServiceException {
        try (BufferedReader reader = Files.newBufferedReader(userDataPath, StandardCharsets.UTF_8)) {
            return reader.lines()
                    .filter(line -> !line.trim().isEmpty())
                    .map(this::parseUserFromLine)
                    .collect(Collectors.toList());
        } catch (IOException e) {
            logger.error("Failed to read user data from file: {}", userDataPath, e);
            throw new UserServiceException("Failed to load user data", e);
        } catch (Exception e) {
            logger.error("Unexpected error while loading users", e);
            throw new UserServiceException("Unexpected error occurred", e);
        }
    }
    
    public void saveUsersToFile(List<User> users) throws UserServiceException {
        Objects.requireNonNull(users, "Users list cannot be null");
        
        try (BufferedWriter writer = Files.newBufferedWriter(userDataPath, StandardCharsets.UTF_8)) {
            for (User user : users) {
                writer.write(formatUserForFile(user));
                writer.newLine();
            }
        } catch (IOException e) {
            logger.error("Failed to save user data to file: {}", userDataPath, e);
            throw new UserServiceException("Failed to save user data", e);
        }
    }
    
    private User parseUserFromLine(String line) {
        String[] parts = line.split(",");
        if (parts.length < 4) {
            throw new IllegalArgumentException("Invalid user data format: " + line);
        }
        
        return new User.Builder()
                .setId(Long.parseLong(parts[0]))
                .setUsername(parts[1])
                .setEmail(parts[2])
                .setStatus(UserStatus.valueOf(parts[3]))
                .build();
    }
    
    private String formatUserForFile(User user) {
        return String.format("%d,%s,%s,%s",
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getStatus());
    }
}
```

⸻

✅ Collections and Streams

- Use appropriate collection types
- Leverage Stream API for data processing
- Avoid null elements in collections
- Use immutable collections when possible

✅ Example:

```java
public class UserAnalyticsService {
    private final List<User> users;
    
    public UserAnalyticsService(List<User> users) {
        this.users = Collections.unmodifiableList(new ArrayList<>(users));
    }
    
    public Map<UserStatus, Long> getUserCountByStatus() {
        return users.stream()
                .collect(Collectors.groupingBy(
                    User::getStatus,
                    Collectors.counting()
                ));
    }
    
    public List<String> getActiveUserEmails() {
        return users.stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(User::getEmail)
                .sorted()
                .collect(Collectors.toList());
    }
    
    public Optional<User> getMostRecentUser() {
        return users.stream()
                .max(Comparator.comparing(User::getCreatedAt));
    }
    
    public double getAverageUsernameLength() {
        return users.stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .mapToInt(user -> user.getUsername().length())
                .average()
                .orElse(0.0);
    }
    
    public Set<String> getUniqueEmailDomains() {
        return users.stream()
                .map(User::getEmail)
                .map(email -> email.substring(email.indexOf('@') + 1))
                .collect(Collectors.toSet());
    }
}
```

⸻

✅ Concurrency

- Use java.util.concurrent utilities
- Implement proper thread safety
- Use immutable objects in concurrent contexts
- Handle interruption properly

✅ Example:

```java
public class ConcurrentUserProcessor {
    private final ExecutorService executorService;
    private final UserService userService;
    
    public ConcurrentUserProcessor(UserService userService, int threadPoolSize) {
        this.userService = Objects.requireNonNull(userService);
        this.executorService = Executors.newFixedThreadPool(threadPoolSize);
    }
    
    public CompletableFuture<List<ProcessingResult>> processUsersAsync(List<Long> userIds) {
        List<CompletableFuture<ProcessingResult>> futures = userIds.stream()
                .map(this::processUserAsync)
                .collect(Collectors.toList());
                
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                        .map(CompletableFuture::join)
                        .collect(Collectors.toList()));
    }
    
    private CompletableFuture<ProcessingResult> processUserAsync(Long userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Optional<User> userOpt = userService.findUserById(userId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    // Simulate processing
                    Thread.sleep(100);
                    return new ProcessingResult(userId, true, "Processed successfully");
                } else {
                    return new ProcessingResult(userId, false, "User not found");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return new ProcessingResult(userId, false, "Processing interrupted");
            } catch (Exception e) {
                return new ProcessingResult(userId, false, "Processing failed: " + e.getMessage());
            }
        }, executorService);
    }
    
    public void shutdown() {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(30, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            executorService.shutdownNow();
        }
    }
    
    public static class ProcessingResult {
        private final Long userId;
        private final boolean success;
        private final String message;
        
        public ProcessingResult(Long userId, boolean success, String message) {
            this.userId = userId;
            this.success = success;
            this.message = message;
        }
        
        // Getters
        public Long getUserId() { return userId; }
        public boolean isSuccess() { return success; }
        public String getMessage() { return message; }
    }
}
```

⸻

🧪 Java Testing

✅ Unit Testing with JUnit 5

- Use descriptive test method names
- Follow AAA pattern (Arrange, Act, Assert)
- Use parameterized tests for multiple scenarios
- Mock dependencies appropriately

✅ Example:

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private EmailValidator emailValidator;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    @DisplayName("Should create user successfully with valid data")
    void shouldCreateUserSuccessfully() {
        // Arrange
        String username = "testuser";
        String email = "test@example.com";
        
        when(emailValidator.isValid(email)).thenReturn(true);
        when(userRepository.existsByUsername(username)).thenReturn(false);
        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act
        User result = userService.createUser(username, email);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo(username);
        assertThat(result.getEmail()).isEqualTo(email);
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        
        verify(userRepository).save(any(User.class));
    }
    
    @ParameterizedTest
    @ValueSource(strings = {"", " ", "ab", "a".repeat(51)})
    @DisplayName("Should throw exception for invalid username")
    void shouldThrowExceptionForInvalidUsername(String invalidUsername) {
        // Act & Assert
        assertThatThrownBy(() -> userService.createUser(invalidUsername, "test@example.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username");
    }
    
    @Test
    @DisplayName("Should return empty Optional when user not found")
    void shouldReturnEmptyOptionalWhenUserNotFound() {
        // Arrange
        long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        
        // Act
        Optional<User> result = userService.findUserById(userId);
        
        // Assert
        assertThat(result).isEmpty();
    }
}
```

⸻

🚦 Java AI Enforcement Summary

✅ Enforce proper encapsulation and access modifiers
✅ Require Override annotations for inherited methods
✅ Block raw types usage (enforce generics)
✅ Require proper equals() and hashCode() implementation
✅ Enforce try-with-resources for resource management
✅ Block deprecated Date/Calendar usage (prefer java.time)
✅ Require proper exception handling and specific exception types
✅ Enforce immutability where appropriate
✅ Require null checks and Optional usage
✅ Auto-fix violations where possible
