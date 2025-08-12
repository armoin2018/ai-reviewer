/**
 * API Response and Error Type Definitions
 * Defines standard response formats and error codes for the Copilot Skillset Reviewer API
 */
// Enumeration of all possible error codes
export var ErrorCode;
(function (ErrorCode) {
    // Client Error Codes (4xx)
    ErrorCode["MISSING_REQUIRED_FIELDS"] = "MISSING_REQUIRED_FIELDS";
    ErrorCode["INVALID_MARKDOWN_FIELD"] = "INVALID_MARKDOWN_FIELD";
    ErrorCode["MISSING_DIFF_FIELD"] = "MISSING_DIFF_FIELD";
    ErrorCode["MISSING_PACK_ID"] = "MISSING_PACK_ID";
    ErrorCode["ENDPOINT_NOT_FOUND"] = "ENDPOINT_NOT_FOUND";
    ErrorCode["INVALID_REQUEST_FORMAT"] = "INVALID_REQUEST_FORMAT";
    // Server Error Codes (5xx)
    ErrorCode["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorCode["LOAD_RULES_FAILED"] = "LOAD_RULES_FAILED";
    ErrorCode["SUMMARIZE_RULES_FAILED"] = "SUMMARIZE_RULES_FAILED";
    ErrorCode["INFER_QUALITY_GATES_FAILED"] = "INFER_QUALITY_GATES_FAILED";
    ErrorCode["NORMALIZE_DIFF_FAILED"] = "NORMALIZE_DIFF_FAILED";
    ErrorCode["ASSERT_COMPLIANCE_FAILED"] = "ASSERT_COMPLIANCE_FAILED";
    ErrorCode["FILE_CONTENTS_FAILED"] = "FILE_CONTENTS_FAILED";
    ErrorCode["BUNDLED_GUIDANCE_FAILED"] = "BUNDLED_GUIDANCE_FAILED";
    ErrorCode["SELECT_INSTRUCTION_PACK_FAILED"] = "SELECT_INSTRUCTION_PACK_FAILED";
    // GitHub Integration Error Codes
    ErrorCode["GITHUB_API_ERROR"] = "GITHUB_API_ERROR";
    ErrorCode["GITHUB_AUTH_ERROR"] = "GITHUB_AUTH_ERROR";
    ErrorCode["GITHUB_RATE_LIMIT"] = "GITHUB_RATE_LIMIT";
    ErrorCode["REPOSITORY_NOT_FOUND"] = "REPOSITORY_NOT_FOUND";
    // Rule Processing Error Codes
    ErrorCode["RULE_PARSING_ERROR"] = "RULE_PARSING_ERROR";
    ErrorCode["INVALID_RULE_FORMAT"] = "INVALID_RULE_FORMAT";
    // Diff Processing Error Codes
    ErrorCode["INVALID_DIFF_FORMAT"] = "INVALID_DIFF_FORMAT";
    ErrorCode["DIFF_TOO_LARGE"] = "DIFF_TOO_LARGE";
    // Compliance Check Error Codes
    ErrorCode["COMPLIANCE_CHECK_FAILED"] = "COMPLIANCE_CHECK_FAILED";
    ErrorCode["FILE_SIZE_EXCEEDED"] = "FILE_SIZE_EXCEEDED";
})(ErrorCode || (ErrorCode = {}));
