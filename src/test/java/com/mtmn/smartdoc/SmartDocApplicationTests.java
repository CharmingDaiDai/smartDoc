package com.mtmn.smartdoc;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@SpringBootTest
class SmartDocApplicationTests {

  @Test
  void contextLoads() {
  }

  public static void main(String[] args) {
    class Solution {
      public int[][] divideArray(int[] nums, int k) {
        int n = nums.length, len = n / 3;
        List<List<Integer>> res = new ArrayList<>();
        if (n < 3)
          return new int[0][];
        Arrays.sort(nums);

        int t = 0, ff = nums[0] + k;
        for (int i = 0; i < n; i += len) {
          if(i + len - 1 < n && nums[i] + k < nums[i + len - 1]){
            return new int[0][];
          }
          int tt = len;
          while(tt-- > 0){
            res.get(t).add(nums[i]);
            i++;
          }
        }

        return (int[][])res.toArray();
      }
    }
  }

}