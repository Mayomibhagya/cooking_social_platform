package Backend.Controller;

import Backend.Model.TipModel;
import Backend.Repository.TipRepository;
import Backend.Repository.UserRepository;
import Backend.Model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/tips")
@CrossOrigin
public class TipController {

    @Autowired
    private TipRepository tipRepo;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public TipModel addTip(@RequestBody TipModel tip, @AuthenticationPrincipal UserDetails userDetails) {
        tip.setUserId(userDetails.getUsername());
        // Fetch user name from the database
        String userName = userRepository.findById(userDetails.getUsername())
            .map(User::getName)
            .orElse(userDetails.getUsername());
        tip.setUserDisplayName(userName);
        tip.setCreatedAt(LocalDateTime.now());
        return tipRepo.save(tip);
    }

    @GetMapping
    public List<TipModel> getAllTips() {
        return tipRepo.findAll();
    }

    @GetMapping("/my")
    public List<TipModel> getMyTips(@AuthenticationPrincipal UserDetails userDetails) {
        return tipRepo.findByUserId(userDetails.getUsername());
    }

    @GetMapping("/search")
    public List<TipModel> searchByTitle(@RequestParam String title) {
        return tipRepo.findByTitleContainingIgnoreCase(title);
    }

    @GetMapping("/category")
    public List<TipModel> getByCategory(@RequestParam String category) {
        return tipRepo.findByCategory(category);
    }

    @GetMapping("/featured")
    public List<TipModel> getFeaturedTips() {
        return tipRepo.findAll().stream().filter(TipModel::isFeatured).toList();
    }

    @GetMapping("/tip-of-the-day")
    public TipModel getTipOfTheDay() {
        List<TipModel> tips = tipRepo.findAll();
        // Show tip with highest rating count (most rated)
        return tips.stream()
            .max((a, b) -> Integer.compare(a.getRatingCount(), b.getRatingCount()))
            .orElse(null);
    }

    @PutMapping("/{id}")
    public TipModel updateTip(@PathVariable String id, @RequestBody TipModel updatedTip, @AuthenticationPrincipal UserDetails userDetails) {
        Optional<TipModel> optionalTip = tipRepo.findById(id);
        if (optionalTip.isPresent()) {
            TipModel tip = optionalTip.get();
            // Only allow update if user is owner
            if (!tip.getUserId().equals(userDetails.getUsername())) return null;
            tip.setTitle(updatedTip.getTitle());
            tip.setDescription(updatedTip.getDescription());
            tip.setCategory(updatedTip.getCategory());
            return tipRepo.save(tip);
        }
        return null;
    }

    @PutMapping("/{id}/rate")
    public ResponseEntity<?> rateTip(
            @PathVariable String id,
            @RequestParam int rating,
            @RequestParam String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Optional<TipModel> optionalTip = tipRepo.findById(id);
        if (optionalTip.isPresent()) {
            TipModel tip = optionalTip.get();
            // Update or add the user's rating
            tip.getUserRatings().put(userId, rating);

            // Recalculate averageRating and ratingCount
            int sum = 0;
            for (int r : tip.getUserRatings().values()) {
                sum += r;
            }
            tip.setRatingCount(tip.getUserRatings().size());
            tip.setAverageRating(tip.getUserRatings().size() > 0 ? (double) sum / tip.getUserRatings().size() : 0);

            tipRepo.save(tip);
            return ResponseEntity.ok(tip);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/user-rating")
    public ResponseEntity<Integer> getUserRating(@PathVariable String id, @RequestParam String userId) {
        try {
            Optional<TipModel> optionalTip = tipRepo.findById(id);
            if (optionalTip.isPresent()) {
                TipModel tip = optionalTip.get();
                Integer rating = tip.getUserRating(userId);
                return ResponseEntity.ok(rating != null ? rating : 0);
            }
            return ResponseEntity.ok(0); // Return 0 instead of 404 when tip not found
        } catch (Exception e) {
            return ResponseEntity.ok(0); // Return 0 for any error
        }
    }

    @DeleteMapping("/{id}")
    public String deleteTip(@PathVariable String id, @AuthenticationPrincipal UserDetails userDetails) {
        Optional<TipModel> optionalTip = tipRepo.findById(id);
        if (optionalTip.isPresent()) {
            TipModel tip = optionalTip.get();
            if (!tip.getUserId().equals(userDetails.getUsername())) return "Unauthorized";
            tipRepo.deleteById(id);
            return "Tip deleted successfully";
        }
        return "Tip not found";
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable String id,
            @RequestBody TipModel.Comment comment,
            @AuthenticationPrincipal UserDetails userDetails) {
        Optional<TipModel> optionalTip = tipRepo.findById(id);
        if (optionalTip.isPresent()) {
            TipModel tip = optionalTip.get();
            comment.setId(java.util.UUID.randomUUID().toString());
            comment.setUserId(userDetails.getUsername());
            String userName = userRepository.findById(userDetails.getUsername())
                .map(User::getName)
                .orElse("Anonymous");
            comment.setUserName(userName);
            comment.setTime(java.time.Instant.now().toString());
            tip.getComments().add(0, comment); // add to top
            tip.setReviewCount(tip.getComments().size());
            tipRepo.save(tip);
            return ResponseEntity.ok(comment);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<?> getComments(@PathVariable String id) {
        Optional<TipModel> optionalTip = tipRepo.findById(id);
        if (optionalTip.isPresent()) {
            return ResponseEntity.ok(optionalTip.get().getComments());
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{tipId}/comments/{commentId}")
    public ResponseEntity<?> updateComment(
            @PathVariable String tipId,
            @PathVariable String commentId,
            @RequestBody TipModel.Comment updatedComment,
            @AuthenticationPrincipal UserDetails userDetails) {
        Optional<TipModel> optionalTip = tipRepo.findById(tipId);
        if (optionalTip.isPresent()) {
            TipModel tip = optionalTip.get();
            for (TipModel.Comment c : tip.getComments()) {
                if (c.getId().equals(commentId) && c.getUserId().equals(userDetails.getUsername())) {
                    c.setText(updatedComment.getText());
                    c.setRating(updatedComment.getRating());
                    tipRepo.save(tip);
                    return ResponseEntity.ok(c);
                }
            }
            return ResponseEntity.status(403).body("Unauthorized");
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{tipId}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable String tipId,
            @PathVariable String commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Optional<TipModel> optionalTip = tipRepo.findById(tipId);
        if (optionalTip.isPresent()) {
            TipModel tip = optionalTip.get();
            boolean removed = tip.getComments().removeIf(
                c -> c.getId().equals(commentId) && c.getUserId().equals(userDetails.getUsername())
            );
            if (removed) {
                tip.setReviewCount(tip.getComments().size());
                tipRepo.save(tip);
                return ResponseEntity.ok("Deleted");
            }
            return ResponseEntity.status(403).body("Unauthorized");
        }
        return ResponseEntity.notFound().build();
    }
}

