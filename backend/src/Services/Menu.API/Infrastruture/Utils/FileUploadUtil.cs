namespace Menu.API.Infrastruture.Utils;

public interface IFileUploadUtil
{
    Task<string> SaveFileAsync(IFormFile file, string folderName = "images");
    void DeleteFile(string filePath);
}

public class FileUploadUtil : IFileUploadUtil
{
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FileUploadUtil> _logger;

    public FileUploadUtil(IWebHostEnvironment environment, ILogger<FileUploadUtil> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Save file to wwwroot/[folderName] and return relative path
    /// </summary>
    public async Task<string> SaveFileAsync(IFormFile file, string folderName = "images")
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty");

        // Validate file size (max 5MB)
        const long maxFileSize = 10 * 1024 * 1024;
        if (file.Length > maxFileSize)
            throw new ArgumentException("File size exceeds 5MB limit");

        try
        {
            var webRootPath = _environment.WebRootPath
    ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            if (!Directory.Exists(webRootPath))
                Directory.CreateDirectory(webRootPath);
            // Create folder if not exists
            var folderPath = Path.Combine(webRootPath, folderName);
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            // Generate unique filename: GUID + original extension
            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(folderPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative path (e.g., "/images/guid-filename.jpg")
            return $"/{folderName}/{fileName}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving file: {FileName}", file.FileName);
            throw;
        }
    }

    /// <summary>
    /// Delete file from wwwroot
    /// </summary>
    public void DeleteFile(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath))
            return;

        try
        {
            // Convert relative path to absolute (remove leading /)
            var filePath = Path.Combine(_environment.WebRootPath, relativePath.TrimStart('/'));
            if (File.Exists(filePath))
                File.Delete(filePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {Path}", relativePath);
        }
    }
}
